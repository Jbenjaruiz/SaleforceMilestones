import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ClockService } from '../common/clock.service';
import { CoreAccessService, ProjectPermissions } from '../core/core-access.service';
import { ProjectSummary, summarizeProject } from '../core/metrics';
import { MilestoneView, ProjectView, toMilestoneView, toProjectView } from '../core/views';
import { Milestone } from '../milestones/milestone.entity';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { Project } from './project.entity';

export interface MilestoneAlert {
  type: 'milestone_without_tasks';
  milestoneId: string;
  code: string;
}

export interface ProjectDashboard {
  project: ProjectView;
  /** The requesting user's permissions in this project. */
  permissions: ProjectPermissions;
  /** Calendar day the delays were computed against. */
  today: string;
  summary: ProjectSummary;
  milestones: MilestoneView[];
  alerts: MilestoneAlert[];
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Milestone) private readonly milestones: Repository<Milestone>,
    private readonly access: CoreAccessService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * The selector: administrators see every project (archived ones only on request); everyone else sees only the
   * projects assigned to them, each with their permissions in it.
   */
  async list(actor: AuthenticatedUser, includeArchived = false): Promise<ProjectView[]> {
    const accessible = await this.access.accessibleProjects(actor, includeArchived && actor.isAdmin);
    return accessible.map(({ project, permissions }) => toProjectView(project, permissions));
  }

  async get(id: string, actor: AuthenticatedUser): Promise<ProjectView> {
    const project = await this.access.project(id, actor, 'read');
    return toProjectView(project, (await this.access.permissionsIn(id, actor)) as ProjectPermissions);
  }

  async dashboard(id: string, actor: AuthenticatedUser): Promise<ProjectDashboard> {
    const project = await this.access.project(id, actor, 'read');
    const permissions = (await this.access.permissionsIn(id, actor)) as ProjectPermissions;
    const today = this.clock.today();
    const milestones = (
      await this.milestones.find({ where: { projectId: id }, relations: { tasks: true }, order: { sortOrder: 'ASC', code: 'ASC' } })
    ).map((milestone) => toMilestoneView(milestone, today));

    return {
      project: toProjectView(project, permissions),
      permissions,
      today,
      summary: summarizeProject(milestones),
      milestones,
      alerts: milestones
        .filter((milestone) => milestone.status === 'no_tasks')
        .map((milestone) => ({ type: 'milestone_without_tasks', milestoneId: milestone.id, code: milestone.code })),
    };
  }

  async create(dto: CreateProjectDto, actor: AuthenticatedUser): Promise<ProjectView> {
    const project = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Project);
      const saved = await repository.save(repository.create({ name: dto.name, description: dto.description || null, createdBy: actor.id }));
      await this.audit.record({ userId: actor.id, entity: 'project', entityId: saved.id, action: 'create', changes: { name: saved.name } }, manager);
      return saved;
    });
    return this.get(project.id, actor);
  }

  async update(id: string, dto: UpdateProjectDto, actor: AuthenticatedUser): Promise<ProjectView> {
    const project = await this.access.project(id, actor, 'update');
    const values = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
    };
    if (Object.keys(values).length > 0) {
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Project).update(id, values);
        await this.audit.record(
          { userId: actor.id, entity: 'project', entityId: id, action: 'update', changes: { before: { name: project.name, description: project.description }, after: values } },
          manager,
        );
      });
    }
    return this.get(id, actor);
  }

  async setArchived(id: string, archived: boolean, actor: AuthenticatedUser): Promise<ProjectView> {
    const project = await this.access.project(id, actor, 'read');
    if (project.isArchived === archived) {
      throw new BadRequestException(archived ? 'The project is already archived.' : 'The project is not archived.');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Project).update(id, {
        isArchived: archived,
        archivedAt: archived ? new Date() : null,
        archivedBy: archived ? actor.id : null,
      });
      await this.audit.record({ userId: actor.id, entity: 'project', entityId: id, action: archived ? 'archive' : 'unarchive', changes: { name: project.name } }, manager);
    });
    return this.get(id, actor);
  }
}
