import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CoreAccessService } from './core-access.service';

const admin = { id: 'a', isAdmin: true } as AuthenticatedUser;
const member = { id: 'm', isAdmin: false } as AuthenticatedUser;

type Assignment = { projectId: string; userId: string; canCreate: boolean; canUpdate: boolean; canDelete: boolean };
const assignment = (overrides: Partial<Assignment> = {}): Assignment => ({ projectId: 'p1', userId: 'm', canCreate: false, canUpdate: false, canDelete: false, ...overrides });

function serviceWith(project: { id: string; isArchived: boolean; name?: string } | null, assignments: Assignment[] = []) {
  const milestone = project ? { id: 'ms1', project } : null;
  return new CoreAccessService(
    { findOne: async () => project, find: async () => (project ? [project] : []) } as never,
    { findOne: async () => milestone } as never,
    { findOne: async () => (project ? { id: 't1', milestone } : null) } as never,
    { findOne: async () => (project ? { id: 'c1', milestone, task: null } : null) } as never,
    {
      findOne: async ({ where }: { where: { projectId: string; userId: string } }) => assignments.find((a) => a.projectId === where.projectId && a.userId === where.userId) ?? null,
      find: async ({ where }: { where: { userId: string } }) => assignments.filter((a) => a.userId === where.userId),
    } as never,
  );
}

const active = { id: 'p1', isArchived: false };
const archived = { id: 'p1', isArchived: true };

describe('CoreAccessService: assignment decides', () => {
  it('lets administrators do everything in any project, without an assignment', async () => {
    const service = serviceWith(active);
    for (const permission of ['read', 'create', 'update', 'delete'] as const) {
      await expect(service.project('p1', admin, permission)).resolves.toBeDefined();
    }
  });

  it('hides a project that is not assigned, as if it did not exist, whatever the permission asked', async () => {
    const service = serviceWith(active, []);
    await expect(service.project('p1', member, 'read')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.milestone('ms1', member, 'read')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.task('t1', member, 'update')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.comment('c1', member, 'read')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('an assignment always lets the user see the project, and nothing more unless it says so', async () => {
    const service = serviceWith(active, [assignment()]);
    await expect(service.project('p1', member, 'read')).resolves.toBeDefined();
    await expect(service.milestone('ms1', member, 'read')).resolves.toBeDefined();
    for (const permission of ['create', 'update', 'delete'] as const) {
      await expect(service.task('t1', member, permission)).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('grants exactly the permissions assigned, each independent of the others', async () => {
    const service = serviceWith(active, [assignment({ canCreate: true, canDelete: true })]);
    await expect(service.milestone('ms1', member, 'create')).resolves.toBeDefined();
    await expect(service.milestone('ms1', member, 'delete')).resolves.toBeDefined();
    await expect(service.milestone('ms1', member, 'update')).rejects.toThrow(/"update" permission/);
  });

  it("ignores someone else's assignment", async () => {
    const service = serviceWith(active, [assignment({ userId: 'other', canCreate: true, canUpdate: true, canDelete: true })]);
    await expect(service.project('p1', member, 'read')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('can force a write check on a read permission (deleting your own comment)', async () => {
    const service = serviceWith(archived, []);
    await expect(service.comment('c1', admin, 'read', true)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.comment('c1', admin, 'read')).resolves.toBeDefined();
  });
});

describe('CoreAccessService: archive rules', () => {
  it('hides an archived project, and everything inside it, from non-administrators even when assigned', async () => {
    const service = serviceWith(archived, [assignment({ canCreate: true, canUpdate: true, canDelete: true })]);
    await expect(service.project('p1', member)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.task('t1', member)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets administrators read an archived project but not change it', async () => {
    const service = serviceWith(archived);
    await expect(service.project('p1', admin)).resolves.toBeDefined();
    await expect(service.task('t1', admin)).resolves.toBeDefined();
    await expect(service.project('p1', admin, 'update')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.milestone('ms1', admin, 'create')).rejects.toThrow(/archived/);
  });

  it('treats a missing record as not found', async () => {
    await expect(serviceWith(null).project('p1', admin)).rejects.toBeInstanceOf(NotFoundException);
    await expect(serviceWith(null).task('t1', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CoreAccessService.accessibleProjects', () => {
  it('gives administrators everything with all permissions', async () => {
    const result = await serviceWith({ id: 'p1', isArchived: false, name: 'A' }).accessibleProjects(admin);
    expect(result).toEqual([{ project: expect.objectContaining({ id: 'p1' }), permissions: { read: true, create: true, update: true, delete: true } }]);
  });

  it('gives everyone else only their assigned projects, each with its own permissions', async () => {
    const service = serviceWith({ id: 'p1', isArchived: false, name: 'A' }, [assignment({ canUpdate: true })]);
    const [item] = await service.accessibleProjects(member);
    expect(item.permissions).toEqual({ read: true, create: false, update: true, delete: false });
  });

  it('gives a user with no assignments an empty list', async () => {
    expect(await serviceWith({ id: 'p1', isArchived: false, name: 'A' }, []).accessibleProjects(member)).toEqual([]);
  });
});

describe('CoreAccessService.permissionsIn', () => {
  it('is null when the project is not assigned and everything for administrators', async () => {
    const service = serviceWith(active, []);
    expect(await service.permissionsIn('p1', member)).toBeNull();
    expect(await service.permissionsIn('p1', admin)).toEqual({ read: true, create: true, update: true, delete: true });
  });
});
