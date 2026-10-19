import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password';

const passwords = new PasswordService();

function setup(user: unknown) {
  const query = { addSelect: () => query, leftJoinAndSelect: () => query, where: () => query, getOne: async () => user };
  const repository = { createQueryBuilder: () => query, update: jest.fn() };
  const audit = { record: jest.fn() };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
  const config = { get: () => '2h' };
  const service = new AuthService(repository as never, passwords, jwt as unknown as JwtService, audit as unknown as AuditService, config as unknown as ConfigService);
  return { service, repository, audit, jwt };
}

const buildUser = async (overrides = {}) => ({
  id: 'u1',
  email: 'admin@example.com',
  fullName: 'Admin',
  isActive: true,
  roleId: 'r1',
  passwordHash: await passwords.hash('correct-horse'),
  role: { id: 'r1', name: 'Administrator', permissions: [] },
  ...overrides,
});

describe('AuthService.login', () => {
  it('returns a token and the user with all permissions for the Administrator', async () => {
    const { service, repository, audit, jwt } = setup(await buildUser());
    const result = await service.login('Admin@Example.com', 'correct-horse');

    expect(result.accessToken).toBe('signed-token');
    expect(result.expiresIn).toBe('2h');
    expect(result.user).toMatchObject({ email: 'admin@example.com', isAdmin: true, permissions: ['read', 'create', 'update', 'delete'] });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1' }, { expiresIn: '2h' });
    expect(repository.update).toHaveBeenCalledWith('u1', { lastLoginAt: expect.any(Date) });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'login', userId: 'u1' }));
  });

  it('fails with the same message for a wrong password and an unknown email', async () => {
    const wrong = setup(await buildUser());
    const unknown = setup(null);

    const a = await wrong.service.login('admin@example.com', 'nope').catch((e) => e);
    const b = await unknown.service.login('ghost@example.com', 'nope').catch((e) => e);

    expect(a).toBeInstanceOf(UnauthorizedException);
    expect(b).toBeInstanceOf(UnauthorizedException);
    expect(a.message).toBe(b.message);
    expect(wrong.audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'login_failed' }));
    expect(unknown.audit.record).not.toHaveBeenCalled(); // audit rows need a user id
  });

  it('does not reveal that an account is inactive', async () => {
    const { service, audit } = setup(await buildUser({ isActive: false }));
    await expect(service.login('admin@example.com', 'correct-horse')).rejects.toThrow('Invalid email or password.');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'login_blocked_inactive' }));
  });
});
