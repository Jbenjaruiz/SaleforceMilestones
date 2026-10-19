import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CoreAccessService } from './core-access.service';

const admin = { id: 'a', isAdmin: true } as AuthenticatedUser;
const member = { id: 'm', isAdmin: false } as AuthenticatedUser;

const serviceWith = (project: { isArchived: boolean } | null) => {
  const milestone = project ? { id: 'ms1', project } : null;
  return new CoreAccessService(
    { findOne: async () => project } as never,
    { findOne: async () => milestone } as never,
    { findOne: async () => (project ? { id: 't1', milestone } : null) } as never,
    { findOne: async () => (project ? { id: 'c1', milestone, task: null } : null) } as never,
  );
};

describe('CoreAccessService archive rules', () => {
  it('hides an archived project, and everything inside it, from non-administrators', async () => {
    const service = serviceWith({ isArchived: true });
    await expect(service.project('p1', member)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.milestone('ms1', member)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.task('t1', member)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.comment('c1', member)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets administrators read an archived project but not change it', async () => {
    const service = serviceWith({ isArchived: true });
    await expect(service.project('p1', admin)).resolves.toBeDefined();
    await expect(service.task('t1', admin)).resolves.toBeDefined();
    await expect(service.project('p1', admin, true)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.milestone('ms1', admin, true)).rejects.toThrow(/archived/);
  });

  it('treats a missing record as not found and an active project as fully usable', async () => {
    await expect(serviceWith(null).project('p1', admin)).rejects.toBeInstanceOf(NotFoundException);
    await expect(serviceWith(null).task('t1', admin)).rejects.toBeInstanceOf(NotFoundException);
    await expect(serviceWith({ isArchived: false }).milestone('ms1', member, true)).resolves.toBeDefined();
  });
});
