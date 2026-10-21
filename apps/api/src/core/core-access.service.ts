import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { Comment } from '../comments/comment.entity';
import { Milestone } from '../milestones/milestone.entity';
import { ProjectMember } from '../project-members/project-member.entity';
import { Project } from '../projects/project.entity';
import { PermissionCode } from '../roles/permissions';
import { Task } from '../tasks/task.entity';

/** What a user may do inside one project. «read» is simply having the project assigned. */
export type ProjectPermissions = Record<PermissionCode, boolean>;

export const ALL_PERMISSIONS: ProjectPermissions = { read: true, create: true, update: true, delete: true };

/**
 * Loads projects, milestones, tasks and comments while enforcing who may touch them.
 *
 * - Administrators can do everything in every project.
 * - Everyone else needs the project assigned to them; the assignment decides their permissions
 *   (the role's own permissions are not used). A project that is not assigned to the user looks like it does not exist.
 * - An archived project is invisible to non-administrators, and read-only for administrators.
 */
@Injectable()
export class CoreAccessService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Milestone) private readonly milestones: Repository<Milestone>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(ProjectMember) private readonly members: Repository<ProjectMember>,
  ) {}

  /** `mutates` defaults to true for every permission except «read»; pass it to force a write check (e.g. deleting your own comment). */
  async project(id: string, actor: AuthenticatedUser, permission: PermissionCode = 'read', mutates = permission !== 'read'): Promise<Project> {
    const project = await this.projects.findOne({ where: { id } });
    return this.check(project, actor, permission, mutates, 'Project not found.');
  }

  async milestone(id: string, actor: AuthenticatedUser, permission: PermissionCode = 'read', mutates = permission !== 'read'): Promise<Milestone> {
    const milestone = await this.milestones.findOne({ where: { id }, relations: { project: true } });
    await this.check(milestone?.project ?? null, actor, permission, mutates, 'Milestone not found.');
    return milestone as Milestone;
  }

  async task(id: string, actor: AuthenticatedUser, permission: PermissionCode = 'read', mutates = permission !== 'read'): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id }, relations: { milestone: { project: true } } });
    await this.check(task?.milestone.project ?? null, actor, permission, mutates, 'Task not found.');
    return task as Task;
  }

  async comment(id: string, actor: AuthenticatedUser, permission: PermissionCode = 'read', mutates = permission !== 'read'): Promise<Comment> {
    const comment = await this.comments.findOne({
      where: { id },
      relations: { milestone: { project: true }, task: { milestone: { project: true } } },
    });
    await this.check(comment?.milestone?.project ?? comment?.task?.milestone.project ?? null, actor, permission, mutates, 'Comment not found.');
    return comment as Comment;
  }

  /** The user's permissions in a project, or null when it is not assigned to them. */
  async permissionsIn(projectId: string, actor: AuthenticatedUser): Promise<ProjectPermissions | null> {
    if (actor.isAdmin) return ALL_PERMISSIONS;
    const member = await this.members.findOne({ where: { projectId, userId: actor.id } });
    return member ? { read: true, create: member.canCreate, update: member.canUpdate, delete: member.canDelete } : null;
  }

  /** The projects the selector offers: everything for administrators (archived only on request), the assigned ones for the rest. */
  async accessibleProjects(actor: AuthenticatedUser, includeArchived = false): Promise<{ project: Project; permissions: ProjectPermissions }[]> {
    if (actor.isAdmin) {
      const all = await this.projects.find({ where: includeArchived ? {} : { isArchived: false }, order: { name: 'ASC' } });
      return all.map((project) => ({ project, permissions: ALL_PERMISSIONS }));
    }

    const assignments = await this.members.find({ where: { userId: actor.id } });
    if (assignments.length === 0) return [];
    const projects = await this.projects.find({ where: { id: In(assignments.map((a) => a.projectId)), isArchived: false }, order: { name: 'ASC' } });
    const byProject = new Map(assignments.map((a) => [a.projectId, a]));
    return projects.map((project) => {
      const member = byProject.get(project.id) as ProjectMember;
      return { project, permissions: { read: true, create: member.canCreate, update: member.canUpdate, delete: member.canDelete } };
    });
  }

  private async check(project: Project | null, actor: AuthenticatedUser, permission: PermissionCode, mutates: boolean, notFound: string): Promise<Project> {
    if (!project || (project.isArchived && !actor.isAdmin)) throw new NotFoundException(notFound);

    const permissions = await this.permissionsIn(project.id, actor);
    if (!permissions) throw new NotFoundException(notFound); // not assigned: do not reveal that it exists
    if (!permissions[permission]) throw new ForbiddenException(`You do not have the "${permission}" permission on this project.`);

    if (mutates && project.isArchived) {
      throw new BadRequestException('This project is archived. Reactivate it to make changes.');
    }
    return project;
  }
}
