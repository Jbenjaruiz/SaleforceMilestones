import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ProjectMembersService } from './project-members.service';

const actor = { id: 'admin', isAdmin: true } as AuthenticatedUser;
const project = (id: string, overrides = {}) => ({ id, name: `Project ${id}`, isArchived: false, ...overrides });
const row = (projectId: string, overrides = {}) => ({
  id: `m-${projectId}`, projectId, userId: 'u1', canCreate: false, canUpdate: false, canDelete: false,
  project: project(projectId), ...overrides,
});
const input = (projectId: string, flags: Partial<Record<'create' | 'update' | 'delete', boolean>> = {}) => ({ projectId, create: false, update: false, delete: false, ...flags });

function setup({ existing = [] as ReturnType<typeof row>[], projects = [project('p1'), project('p2')], role = 'Editor', userFound = true } = {}) {
  const calls = { insert: jest.fn(), update: jest.fn(), delete: jest.fn() };
  const members = { find: jest.fn(async () => existing) };
  const users = { findOne: jest.fn(async () => (userFound ? { id: 'u1', role: { name: role } } : null)) };
  const projectsRepo = { find: jest.fn(async ({ where }: any) => projects.filter((p) => where.id.value?.includes?.(p.id) ?? true)) };
  const audit = { record: jest.fn() };
  const manager = { getRepository: () => calls };
  const dataSource = { transaction: async (fn: (m: unknown) => unknown) => fn(manager) };
  const service = new ProjectMembersService(members as never, users as never, projectsRepo as never, audit as never, dataSource as never);
  return { service, calls, audit };
}

describe('ProjectMembersService.replace', () => {
  it('assigns new projects with their permissions', async () => {
    const { service, calls, audit } = setup();
    await service.replace('u1', [input('p1', { create: true }), input('p2', { update: true, delete: true })], actor);
    expect(calls.insert).toHaveBeenCalledWith([
      { projectId: 'p1', userId: 'u1', canCreate: true, canUpdate: false, canDelete: false, createdBy: 'admin' },
      { projectId: 'p2', userId: 'u1', canCreate: false, canUpdate: true, canDelete: true, createdBy: 'admin' },
    ]);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'projects_assigned', entity: 'user', entityId: 'u1' }), expect.anything());
  });

  it('changes permissions of an existing assignment and removes the ones left out', async () => {
    const { service, calls } = setup({ existing: [row('p1'), row('p2', { canCreate: true })] });
    await service.replace('u1', [input('p1', { update: true })], actor);
    expect(calls.update).toHaveBeenCalledWith({ projectId: 'p1', userId: 'u1' }, expect.objectContaining({ canUpdate: true, canCreate: false }));
    expect(calls.delete).toHaveBeenCalledWith(['m-p2']);
    expect(calls.insert).not.toHaveBeenCalled();
  });

  it('does nothing, and records nothing, when nothing changes', async () => {
    const { service, calls, audit } = setup({ existing: [row('p1', { canUpdate: true })] });
    await service.replace('u1', [input('p1', { update: true })], actor);
    expect(calls.insert).not.toHaveBeenCalled();
    expect(calls.update).not.toHaveBeenCalled();
    expect(calls.delete).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('can clear every assignment with an empty list', async () => {
    const { service, calls } = setup({ existing: [row('p1'), row('p2')] });
    await service.replace('u1', [], actor);
    expect(calls.delete).toHaveBeenCalledWith(['m-p1', 'm-p2']);
  });

  it('leaves assignments to archived projects untouched', async () => {
    const archivedRow = row('p9', { project: project('p9', { isArchived: true }), canCreate: true });
    const { service, calls } = setup({ existing: [archivedRow, row('p1')] });
    await service.replace('u1', [], actor);
    expect(calls.delete).toHaveBeenCalledWith(['m-p1']); // p9 is not removed
  });

  it('refuses to assign an archived project', async () => {
    const { service } = setup({ projects: [project('p1', { isArchived: true })] });
    await expect(service.replace('u1', [input('p1')], actor)).rejects.toThrow(/archived/);
  });

  it('refuses administrators, unknown users and unknown projects', async () => {
    await expect(setup({ role: 'Administrator' }).service.replace('u1', [input('p1')], actor)).rejects.toThrow(/Administrators already have access/);
    await expect(setup({ userFound: false }).service.replace('u1', [], actor)).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ projects: [] }).service.replace('u1', [input('p1')], actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses the same project twice', async () => {
    await expect(setup().service.replace('u1', [input('p1'), input('p1', { create: true })], actor)).rejects.toBeInstanceOf(BadRequestException);
  });
});
