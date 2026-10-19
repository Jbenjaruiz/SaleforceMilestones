import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CommentsService } from './comments.service';

const user = (id: string, isAdmin = false) => ({ id, isAdmin }) as AuthenticatedUser;

function setup() {
  const comment = { id: 'c1', authorId: 'author', milestoneId: 'm1', taskId: null };
  const deleted: unknown[] = [];
  const manager = {
    getRepository: () => ({ find: async () => [], delete: async (x: unknown) => void deleted.push(x) }),
  };
  const access = { comment: async () => comment };
  const audit = { record: jest.fn() };
  const dataSource = { transaction: async (fn: (m: unknown) => unknown) => fn(manager) };
  const service = new CommentsService({} as never, access as never, audit as never, dataSource as never);
  return { service, deleted, audit };
}

describe('CommentsService.remove', () => {
  it('lets the author delete their own comment', async () => {
    const { service, deleted } = setup();
    await service.remove('c1', user('author'));
    expect(deleted).toContain('c1');
  });

  it('lets an administrator delete anyone\'s comment', async () => {
    const { service, audit } = setup();
    await service.remove('c1', user('someone-else', true));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'comment', action: 'delete', userId: 'someone-else' }), expect.anything());
  });

  it('forbids everyone else', async () => {
    const { service, deleted } = setup();
    await expect(service.remove('c1', user('other'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleted).toHaveLength(0);
  });
});
