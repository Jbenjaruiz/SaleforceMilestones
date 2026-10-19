import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { UsersService } from './users.service';

const actor = { id: 'actor', isAdmin: true } as AuthenticatedUser;
const adminRole = { id: 'r-admin', name: 'Administrator' };
const reviewerRole = { id: 'r-rev', name: 'Reviewer' };

const stored = (overrides = {}) => ({
  id: 'u1',
  email: 'u1@example.com',
  fullName: 'User One',
  isActive: true,
  roleId: adminRole.id,
  role: adminRole,
  lastLoginAt: null,
  createdAt: new Date(),
  ...overrides,
});

function setup({ user = stored(), otherActiveAdmins = 1, emailTaken = false } = {}) {
  const manager = { getRepository: () => ({ update: jest.fn(), save: jest.fn(async (x) => ({ id: 'new', ...x })), create: (x: unknown) => x }) };
  const users = {
    find: jest.fn(),
    findOne: jest.fn(async () => user),
    count: jest.fn(async () => otherActiveAdmins),
    exists: jest.fn(async () => emailTaken),
  };
  const roles = { findOne: jest.fn(async ({ where }: any) => [adminRole, reviewerRole].find((r) => r.id === where.id) ?? null) };
  const passwords = { hash: jest.fn(async (p: string) => `hash(${p})`) };
  const audit = { record: jest.fn() };
  const dataSource = { transaction: async (fn: (m: unknown) => unknown) => fn(manager) };
  const service = new UsersService(users as never, roles as never, passwords as never, audit as never, dataSource as never);
  return { service, users, passwords, audit };
}

describe('UsersService', () => {
  it('creates a user with a lowercase email and a hashed password, and audits it without the password', async () => {
    const { service, passwords, audit } = setup({ user: stored({ id: 'new' }) as never });
    await service.create({ email: ' New@Example.COM ', fullName: ' New User ', password: 'secret12', roleId: reviewerRole.id }, actor);

    expect(passwords.hash).toHaveBeenCalledWith('secret12');
    const entry = audit.record.mock.calls[0][0];
    expect(entry).toMatchObject({ action: 'create', userId: 'actor', changes: { email: 'new@example.com', fullName: 'New User' } });
    expect(JSON.stringify(entry)).not.toContain('secret12');
  });

  it('rejects a duplicate email', async () => {
    const { service } = setup({ emailTaken: true });
    await expect(service.create({ email: 'a@b.co', fullName: 'A', password: 'secret12', roleId: reviewerRole.id }, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not let administrators deactivate themselves', async () => {
    const { service } = setup({ user: stored({ id: 'actor' }) as never });
    await expect(service.update('actor', { isActive: false }, actor)).rejects.toThrow(/own account/);
  });

  it('refuses to remove the last active administrator, by deactivation or by changing the role', async () => {
    const { service } = setup({ otherActiveAdmins: 0 });
    await expect(service.update('u1', { isActive: false }, actor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('u1', { roleId: reviewerRole.id }, actor)).rejects.toThrow(/at least one active administrator/);
  });

  it('allows it when another active administrator remains', async () => {
    const { service, audit } = setup({ otherActiveAdmins: 1 });
    await service.update('u1', { roleId: reviewerRole.id }, actor);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', changes: { before: { roleId: adminRole.id }, after: { roleId: reviewerRole.id } } }),
      expect.anything(),
    );
  });

  it('records nothing when nothing changes', async () => {
    const { service, audit } = setup();
    await service.update('u1', { fullName: 'User One' }, actor);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('resets a password and audits it without the new value', async () => {
    const { service, audit } = setup();
    await service.resetPassword('u1', 'brand-new-pass', actor);
    const entry = audit.record.mock.calls[0][0];
    expect(entry.action).toBe('password_reset');
    expect(JSON.stringify(entry)).not.toContain('brand-new-pass');
  });
});
