import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { AttachmentStorage } from '../attachments/attachment-storage';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ClockService } from '../common/clock.service';
import { deleteMilestone } from '../core/cascade';
import { CoreAccessService } from '../core/core-access.service';
import { MilestoneView, toMilestoneView } from '../core/views';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { Milestone } from './milestone.entity';

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(Milestone) private readonly milestones: Repository<Milestone>,
    private readonly access: CoreAccessService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly storage: AttachmentStorage,
    private readonly dataSource: DataSource,
  ) {}

  async get(id: string, actor: AuthenticatedUser): Promise<MilestoneView> {
    await this.access.milestone(id, actor);
    return this.view(id);
  }

  async create(projectId: string, dto: CreateMilestoneDto, actor: AuthenticatedUser): Promise<MilestoneView> {
    await this.access.project(projectId, actor, true);
    const code = dto.code.toUpperCase();
    await this.assertCodeFree(projectId, code);

    const { max } = (await this.milestones
      .createQueryBuilder('m')
      .select('MAX(m.sortOrder)', 'max')
      .where('m.projectId = :projectId', { projectId })
      .getRawOne()) as { max: number | null };

    const created = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Milestone);
      const milestone = await repository.save(
        repository.create({ projectId, code, name: dto.name, description: dto.description || null, sortOrder: (max ?? 0) + 1, createdBy: actor.id }),
      );
      await this.audit.record({ userId: actor.id, entity: 'milestone', entityId: milestone.id, action: 'create', changes: { projectId, code, name: dto.name } }, manager);
      return milestone;
    });
    return this.view(created.id);
  }

  async update(id: string, dto: UpdateMilestoneDto, actor: AuthenticatedUser): Promise<MilestoneView> {
    const milestone = await this.access.milestone(id, actor, true);
    const code = dto.code?.toUpperCase();
    if (code && code !== milestone.code) await this.assertCodeFree(milestone.projectId, code, id);

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const track = (key: 'code' | 'name' | 'description', value: string | null | undefined) => {
      if (value !== undefined && value !== milestone[key]) {
        before[key] = milestone[key];
        after[key] = value;
      }
    };
    track('code', code);
    track('name', dto.name);
    track('description', dto.description === undefined ? undefined : dto.description || null);

    if (Object.keys(after).length > 0) {
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Milestone).update(id, { ...after, updatedBy: actor.id, updatedAt: new Date() });
        await this.audit.record({ userId: actor.id, entity: 'milestone', entityId: id, action: 'update', changes: { before, after } }, manager);
      });
    }
    return this.view(id);
  }

  /** Deletes the milestone with its tasks, comments and attachments. */
  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const milestone = await this.access.milestone(id, actor, true);
    const report = await this.dataSource.transaction(async (manager) => {
      const report = await deleteMilestone(manager, id);
      await this.audit.record(
        {
          userId: actor.id,
          entity: 'milestone',
          entityId: id,
          action: 'delete',
          changes: { projectId: milestone.projectId, code: milestone.code, name: milestone.name, tasks: report.tasks, comments: report.comments, attachments: report.attachments },
        },
        manager,
      );
      return report;
    });
    await this.storage.removeMany(report.storageKeys);
  }

  private async view(id: string): Promise<MilestoneView> {
    const milestone = await this.milestones.findOneOrFail({ where: { id }, relations: { tasks: true } });
    return toMilestoneView(milestone, this.clock.today());
  }

  private async assertCodeFree(projectId: string, code: string, exceptId?: string): Promise<void> {
    const taken = await this.milestones.exists({ where: { projectId, code, ...(exceptId ? { id: Not(exceptId) } : {}) } });
    if (taken) throw new ConflictException(`A milestone with code ${code} already exists in this project.`);
  }
}
