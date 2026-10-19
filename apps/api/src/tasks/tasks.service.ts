import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AttachmentStorage } from '../attachments/attachment-storage';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ClockService } from '../common/clock.service';
import { deleteTasks } from '../core/cascade';
import { CoreAccessService } from '../core/core-access.service';
import { TaskView, toTaskView } from '../core/views';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly access: CoreAccessService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly storage: AttachmentStorage,
    private readonly dataSource: DataSource,
  ) {}

  async get(id: string, actor: AuthenticatedUser): Promise<TaskView> {
    await this.access.task(id, actor);
    return this.view(id);
  }

  async create(milestoneId: string, dto: CreateTaskDto, actor: AuthenticatedUser): Promise<TaskView> {
    await this.access.milestone(milestoneId, actor, true);
    this.assertDateOrder(dto.startDate, dto.estimatedDate);

    const { max } = (await this.tasks
      .createQueryBuilder('t')
      .select('MAX(t.sortOrder)', 'max')
      .where('t.milestoneId = :milestoneId', { milestoneId })
      .getRawOne()) as { max: number | null };

    const created = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Task);
      const task = await repository.save(
        repository.create({
          milestoneId,
          name: dto.name,
          responsible: dto.responsible || null,
          startDate: dto.startDate,
          estimatedDate: dto.estimatedDate,
          actualDate: null,
          isCompleted: false,
          sortOrder: (max ?? 0) + 1,
          createdBy: actor.id,
        }),
      );
      await this.audit.record(
        { userId: actor.id, entity: 'task', entityId: task.id, action: 'create', changes: { milestoneId, name: dto.name, startDate: dto.startDate, estimatedDate: dto.estimatedDate } },
        manager,
      );
      return task;
    });
    return this.view(created.id);
  }

  async update(id: string, dto: UpdateTaskDto, actor: AuthenticatedUser): Promise<TaskView> {
    const task = await this.access.task(id, actor, true);
    this.assertDateOrder(dto.startDate ?? task.startDate, dto.estimatedDate ?? task.estimatedDate);

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const track = (key: 'name' | 'responsible' | 'startDate' | 'estimatedDate', value: string | null | undefined) => {
      if (value !== undefined && value !== task[key]) {
        before[key] = task[key];
        after[key] = value;
      }
    };
    track('name', dto.name);
    track('responsible', dto.responsible === undefined ? undefined : dto.responsible || null);
    track('startDate', dto.startDate);
    track('estimatedDate', dto.estimatedDate);

    if (Object.keys(after).length > 0) {
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Task).update(id, { ...after, updatedBy: actor.id, updatedAt: new Date() });
        await this.audit.record({ userId: actor.id, entity: 'task', entityId: id, action: 'update', changes: { before, after } }, manager);
      });
    }
    return this.view(id);
  }

  /**
   * The check button. Completing stamps the real delivery date with today, and every new check stamps a
   * new date; unchecking clears it. The date is never edited by hand. Repeating the current state does nothing.
   */
  async setCompletion(id: string, completed: boolean, actor: AuthenticatedUser): Promise<TaskView> {
    const task = await this.access.task(id, actor, true);
    if (task.isCompleted === completed) return this.view(id);

    const actualDate = completed ? this.clock.today() : null;
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Task).update(id, { isCompleted: completed, actualDate, updatedBy: actor.id, updatedAt: new Date() });
      await this.audit.record(
        { userId: actor.id, entity: 'task', entityId: id, action: completed ? 'complete' : 'uncomplete', changes: { before: { actualDate: task.actualDate }, after: { actualDate } } },
        manager,
      );
    });
    return this.view(id);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const task = await this.access.task(id, actor, true);
    const report = await this.dataSource.transaction(async (manager) => {
      const report = await deleteTasks(manager, [id]);
      await this.audit.record(
        { userId: actor.id, entity: 'task', entityId: id, action: 'delete', changes: { milestoneId: task.milestoneId, name: task.name, comments: report.comments, attachments: report.attachments } },
        manager,
      );
      return report;
    });
    await this.storage.removeMany(report.storageKeys);
  }

  private async view(id: string): Promise<TaskView> {
    return toTaskView(await this.tasks.findOneOrFail({ where: { id } }), this.clock.today());
  }

  private assertDateOrder(startDate: string, estimatedDate: string): void {
    if (estimatedDate < startDate) {
      throw new BadRequestException('The estimated date cannot be earlier than the start date.');
    }
  }
}
