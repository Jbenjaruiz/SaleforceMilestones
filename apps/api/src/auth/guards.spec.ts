import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';
import { AdminOnly, Public, RequirePermission } from './decorators';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

@Controller('probe')
class ProbeController {
  @Public() @Get('public') open() { return { ok: true }; }
  @Get('session') session() { return { ok: true }; }
  @RequirePermission('read') @Get('read') read() { return { ok: true }; }
  @RequirePermission('delete') @Get('delete') remove() { return { ok: true }; }
  @AdminOnly() @Get('admin') admin() { return { ok: true }; }
}

const roleWith = (name: string, codes: string[]) =>
  ({ id: `role-${name}`, name, permissions: codes.map((code) => ({ code })) }) as unknown as Role;

const people: Record<string, Partial<User>> = {
  admin: { id: 'admin', email: 'a@x.com', fullName: 'Admin', isActive: true, roleId: 'r1', role: roleWith('Administrator', []) },
  reviewer: { id: 'rev', email: 'r@x.com', fullName: 'Rev', isActive: true, roleId: 'r2', role: roleWith('Reviewer', ['read']) },
  inactive: { id: 'off', email: 'o@x.com', fullName: 'Off', isActive: false, roleId: 'r2', role: roleWith('Reviewer', ['read']) },
};

describe('authentication and permission guards', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret-test-secret-test-secret' })],
      controllers: [ProbeController],
      providers: [
        { provide: getRepositoryToken(User), useValue: { findOne: async ({ where }: any) => people[Object.keys(people).find((k) => people[k].id === where.id)!] ?? null } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(() => app.close());

  const as = (who: string) => `Bearer ${jwt.sign({ sub: people[who].id })}`;
  const get = (path: string, auth?: string) => request(app.getHttpServer()).get(`/probe/${path}`).set(auth ? { Authorization: auth } : {});

  it('lets public routes through without a session', async () => {
    await get('public').expect(200);
  });

  it('requires a session on every other route', async () => {
    await get('session').expect(401);
    await get('session', 'Bearer not-a-token').expect(401);
    await get('session', 'Basic abc').expect(401);
    await get('session', as('reviewer')).expect(200);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: 'rev' }, { expiresIn: -10 });
    await get('session', `Bearer ${expired}`).expect(401);
  });

  it('rejects a valid token whose account was deactivated', async () => {
    await get('session', as('inactive')).expect(401);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    await get('session', `Bearer ${jwt.sign({ sub: 'ghost' })}`).expect(401);
  });

  it('applies the permission a route requires', async () => {
    await get('read', as('reviewer')).expect(200);
    await get('delete', as('reviewer')).expect(403);
  });

  it('keeps admin-only routes away from other roles', async () => {
    await get('admin', as('reviewer')).expect(403);
  });

  it('lets the Administrator do everything', async () => {
    for (const path of ['read', 'delete', 'admin']) await get(path, as('admin')).expect(200);
  });
});
