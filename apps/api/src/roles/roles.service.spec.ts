import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { RolesService } from './roles.service';

const actor = { id: 'actor' } as AuthenticatedUser;

const role = (overrides = {}) => ({
  id: 'r1',
  name: 'Editor',
  description: null,
  isProtected: false,
  permissions: [{ id: 'p-read', code: 'read' }, { id: 'p-update', code: 'update' }],
  ...overrides,
});

function setup({ found = role(), userCount = 0, nameTaken = false } = {}) {
  const rolesRepo = { findOne: jest.fn(async () => found), exists: jest.fn(async () => nameTaken), find: jest.fn() };
  const usersRepo = { count: jest.fn(async () => userCount) };
  const calls = { roleUpdate: jest.fn(), roleDelete: jest.fn(), permDelete: jest.fn(), permInsert: jest.fn() };
  const manager = {
    getRepository: (entity: { name: string }) =>
      entity.name === 'Role'
        ? { update: calls.roleUpdate, delete: calls.roleDelete, save: async (x: object) => ({ id: 'new', ...x }), create: (x: object) => x }
        : { delete: calls.permDelete, insert: calls.permInsert },
  };
  const audit = { record: jest.fn() };
  const dataSource = { transaction: async (fn: (m: unknown) => unknown) => fn(manager) };
  const service = new RolesService(rolesRepo as never, usersRepo as never, audit as never, dataSource as never);
  return { service, calls, audit };
}

describe('RolesService', () => {
  it('never modifies or deletes a protected role', async () => {
    const { service } = setup({ found: role({ isProtected: true }) });
    await expect(service.update('r1', { name: 'Hacked' }, actor)).rejects.toThrow(/protected role cannot be modified/);
    await expect(service.remove('r1', actor)).rejects.toThrow(/protected role cannot be deleted/);
  });

  it('refuses to delete a role that still has users', async () => {
    const { service, calls } = setup({ userCount: 3 });
    await expect(service.remove('r1', actor)).rejects.toBeInstanceOf(ConflictException);
    expect(calls.roleDelete).not.toHaveBeenCalled();
  });

  it('deletes an empty role and audits it', async () => {
    const { service, calls, audit } = setup();
    await service.remove('r1', actor);
    expect(calls.roleDelete).toHaveBeenCalledWith('r1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'role', action: 'delete' }), expect.anything());
  });

  it('applies only the permission difference when updating', async () => {
    const { service, calls } = setup();
    await service.update('r1', { permissions: ['read', 'create'] }, actor);
    expect(calls.permDelete).toHaveBeenCalledWith(['p-update']);
    expect(calls.permInsert).toHaveBeenCalledWith([{ roleId: 'r1', code: 'create' }]);
  });

  it('does not issue an empty UPDATE when only permissions change', async () => {
    const { service, calls } = setup();
    await service.update('r1', { permissions: ['read'] }, actor);
    expect(calls.roleUpdate).not.toHaveBeenCalled();
  });

  it('keeps permissions untouched when none are sent', async () => {
    const { service, calls } = setup();
    await service.update('r1', { description: 'New text' }, actor);
    expect(calls.permDelete).not.toHaveBeenCalled();
    expect(calls.permInsert).not.toHaveBeenCalled();
  });

  it('rejects a name that is already taken', async () => {
    const { service } = setup({ nameTaken: true });
    await expect(service.create({ name: 'Editor', permissions: ['read'] }, actor)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update('r1', { name: 'Other' }, actor)).rejects.toBeInstanceOf(ConflictException);
  });
});

void BadRequestException;
