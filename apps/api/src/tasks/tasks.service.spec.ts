import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { TasksService } from './tasks.service';

const actor = { id: 'u1' } as AuthenticatedUser;

const stored = (overrides = {}) => ({
  id: 't1',
  milestoneId: 'm1',
  name: 'Task',
  responsible: null,
  startDate: '2026-10-19',
  estimatedDate: '2026-10-23',
  actualDate: null,
  isCompleted: false,
  sortOrder: 1,
  ...overrides,
});

function setup(initial = stored()) {
  const state = { task: initial, today: '2026-10-21' };
  const updates: Record<string, unknown>[] = [];
  const manager = {
    getRepository: () => ({
      update: jest.fn(async (_id: string, values: Record<string, unknown>) => {
        updates.push(values);
        Object.assign(state.task, values);
      }),
    }),
  };
  const repository = { findOneOrFail: async () => state.task };
  const access = { task: async () => state.task, milestone: async () => ({ id: 'm1' }) };
  const clock = { today: () => state.today };
  const audit = { record: jest.fn() };
  const dataSource = { transaction: async (fn: (m: unknown) => unknown) => fn(manager) };
  const service = new TasksService(repository as never, access as never, clock as never, audit as never, { removeMany: jest.fn() } as never, dataSource as never);
  return { service, state, updates, audit };
}

describe('TasksService.setCompletion', () => {
  it('stamps the real delivery date with today when checked', async () => {
    const { service, updates, audit } = setup();
    const view = await service.setCompletion('t1', true, actor);
    expect(updates[0]).toMatchObject({ isCompleted: true, actualDate: '2026-10-21' });
    expect(view).toMatchObject({ isCompleted: true, status: 'completed', actualDate: '2026-10-21' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'complete' }), expect.anything());
  });

  it('clears the date when unchecked and stamps a new one on the next check', async () => {
    const { service, state, updates } = setup();
    await service.setCompletion('t1', true, actor);
    await service.setCompletion('t1', false, actor);
    expect(updates[1]).toMatchObject({ isCompleted: false, actualDate: null });

    state.today = '2026-10-27';
    const view = await service.setCompletion('t1', true, actor);
    expect(view.actualDate).toBe('2026-10-27');
  });

  it('does nothing, and records nothing, when the task is already in the requested state', async () => {
    const { service, updates, audit } = setup(stored({ isCompleted: true, actualDate: '2026-10-20' }));
    await service.setCompletion('t1', true, actor);
    expect(updates).toHaveLength(0);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('TasksService dates', () => {
  it('rejects an estimated date earlier than the start date on create and on update', async () => {
    const { service } = setup();
    await expect(service.create('m1', { name: 'X', startDate: '2026-10-20', estimatedDate: '2026-10-19' }, actor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('t1', { estimatedDate: '2026-10-01' }, actor)).rejects.toThrow(/earlier than the start date/);
    await expect(service.update('t1', { startDate: '2026-11-01' }, actor)).rejects.toThrow(/earlier than the start date/);
  });
});
