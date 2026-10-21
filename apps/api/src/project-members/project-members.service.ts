import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { Project } from '../projects/project.entity';
import { ADMIN_ROLE_NAME } from '../roles/permissions';
import { User } from '../users/user.entity';
import { AssignmentDto } from './dto/assignment.dto';
import { ProjectMember } from './project-member.entity';

export interface AssignmentView {
  projectId: string;
  projectName: string;
  isArchived: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

const toView = (member: ProjectMember): AssignmentView => ({
  projectId: member.projectId,
  projectName: member.project.name,
  isArchived: member.project.isArchived,
  create: member.canCreate,
  update: member.canUpdate,
  delete: member.canDelete,
});

@Injectable()
export class ProjectMembersService {
  constructor(
    @InjectRepository(ProjectMember) private readonly members: Repository<ProjectMember>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async list(userId: string): Promise<AssignmentView[]> {
    await this.findUserOrFail(userId);
    return this.current(userId);
  }

  /**
   * Replaces the user's project assignments with exactly the ones sent, in one transaction.
   * Assignments to archived projects are left as they are: archived projects cannot be assigned or changed.
   */
  async replace(userId: string, requested: AssignmentDto[], actor: AuthenticatedUser): Promise<AssignmentView[]> {
    const user = await this.findUserOrFail(userId);
    if (user.role.name === ADMIN_ROLE_NAME) {
      throw new BadRequestException('Administrators already have access to every project.');
    }

    const ids = requested.map((assignment) => assignment.projectId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('A project appears more than once.');

    const found = ids.length > 0 ? await this.projects.find({ where: { id: In(ids) } }) : [];
    if (found.length !== ids.length) throw new NotFoundException('Project not found.');

    const existing = await this.members.find({ where: { userId }, relations: { project: true } });
    const existingByProject = new Map(existing.map((member) => [member.projectId, member]));

    const archivedChange = found.find((project) => project.isArchived && !existingByProject.has(project.id));
    if (archivedChange) throw new BadRequestException('An archived project cannot be assigned. Reactivate it first.');

    const requestedById = new Map(requested.map((assignment) => [assignment.projectId, assignment]));
    const toRemove = existing.filter((member) => !requestedById.has(member.projectId) && !member.project.isArchived);
    const toAdd = requested.filter((assignment) => !existingByProject.has(assignment.projectId));
    const toUpdate = requested.filter((assignment) => {
      const member = existingByProject.get(assignment.projectId);
      return member && !member.project.isArchived && (member.canCreate !== assignment.create || member.canUpdate !== assignment.update || member.canDelete !== assignment.delete);
    });

    if (toRemove.length + toAdd.length + toUpdate.length > 0) {
      const names = new Map(found.map((project) => [project.id, project.name]));
      await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(ProjectMember);
        if (toRemove.length > 0) await repository.delete(toRemove.map((member) => member.id));
        if (toAdd.length > 0) {
          await repository.insert(toAdd.map((a) => ({ projectId: a.projectId, userId, canCreate: a.create, canUpdate: a.update, canDelete: a.delete, createdBy: actor.id })));
        }
        for (const a of toUpdate) {
          await repository.update({ projectId: a.projectId, userId }, { canCreate: a.create, canUpdate: a.update, canDelete: a.delete, updatedAt: new Date() });
        }
        await this.audit.record(
          {
            userId: actor.id,
            entity: 'user',
            entityId: userId,
            action: 'projects_assigned',
            changes: {
              added: toAdd.map((a) => ({ project: names.get(a.projectId), create: a.create, update: a.update, delete: a.delete })),
              changed: toUpdate.map((a) => ({ project: names.get(a.projectId), create: a.create, update: a.update, delete: a.delete })),
              removed: toRemove.map((member) => member.project.name),
            },
          },
          manager,
        );
      });
    }
    return this.current(userId);
  }

  private async current(userId: string): Promise<AssignmentView[]> {
    const rows = await this.members.find({ where: { userId }, relations: { project: true } });
    return rows.map(toView).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }

  private async findUserOrFail(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id }, relations: { role: true } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }
}
