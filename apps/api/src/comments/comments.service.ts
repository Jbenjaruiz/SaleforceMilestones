import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { Attachment } from '../attachments/attachment.entity';
import { AttachmentStorage } from '../attachments/attachment-storage';
import { AttachmentsService, AttachmentView } from '../attachments/attachments.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CoreAccessService } from '../core/core-access.service';
import { Comment } from './comment.entity';

export interface CommentView {
  id: string;
  milestoneId: string | null;
  taskId: string | null;
  author: { id: string; fullName: string };
  body: string;
  createdAt: Date;
  attachments: AttachmentView[];
}

const toCommentView = (comment: Comment, attachments: AttachmentView[] = []): CommentView => ({
  id: comment.id,
  milestoneId: comment.milestoneId,
  taskId: comment.taskId,
  author: { id: comment.author.id, fullName: comment.author.fullName },
  body: comment.body,
  createdAt: comment.createdAt,
  attachments,
});

type Target = { milestoneId: string } | { taskId: string };

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    private readonly access: CoreAccessService,
    private readonly attachments: AttachmentsService,
    private readonly storage: AttachmentStorage,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async listForMilestone(milestoneId: string, actor: AuthenticatedUser): Promise<CommentView[]> {
    await this.access.milestone(milestoneId, actor);
    return this.list({ milestoneId });
  }

  async listForTask(taskId: string, actor: AuthenticatedUser): Promise<CommentView[]> {
    await this.access.task(taskId, actor);
    return this.list({ taskId });
  }

  async createForMilestone(milestoneId: string, body: string, files: Express.Multer.File[] | undefined, actor: AuthenticatedUser): Promise<CommentView> {
    await this.access.milestone(milestoneId, actor, true);
    return this.create({ milestoneId }, body, files, actor);
  }

  async createForTask(taskId: string, body: string, files: Express.Multer.File[] | undefined, actor: AuthenticatedUser): Promise<CommentView> {
    await this.access.task(taskId, actor, true);
    return this.create({ taskId }, body, files, actor);
  }

  /** Comments are never edited. Their author or an administrator can delete them (with their attachments). */
  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const comment = await this.access.comment(id, actor, true);
    if (comment.authorId !== actor.id && !actor.isAdmin) {
      throw new ForbiddenException('Only the author or an administrator can delete a comment.');
    }

    const storageKeys = await this.dataSource.transaction(async (manager) => {
      const attachments = await manager.getRepository(Attachment).find({ select: { id: true, storageKey: true }, where: { commentId: id } });
      if (attachments.length > 0) await manager.getRepository(Attachment).delete(attachments.map((a) => a.id));
      await manager.getRepository(Comment).delete(id);
      await this.audit.record(
        { userId: actor.id, entity: 'comment', entityId: id, action: 'delete', changes: { authorId: comment.authorId, milestoneId: comment.milestoneId, taskId: comment.taskId, attachments: attachments.length } },
        manager,
      );
      return attachments.map((a) => a.storageKey);
    });
    await this.storage.removeMany(storageKeys);
  }

  private async list(target: Target): Promise<CommentView[]> {
    const comments = await this.comments.find({ where: target as FindOptionsWhere<Comment>, relations: { author: true }, order: { createdAt: 'ASC' } });
    const attachments = await this.attachments.forComments(comments.map((comment) => comment.id));
    return comments.map((comment) => toCommentView(comment, attachments.get(comment.id)));
  }

  private async create(target: Target, body: string, files: Express.Multer.File[] | undefined, actor: AuthenticatedUser): Promise<CommentView> {
    // Validate the files first and write them last-but-one, so an invalid upload never leaves a comment behind.
    const stored = await this.attachments.store(this.attachments.prepare(files));
    let id: string;
    try {
      id = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Comment);
        const comment = await repository.save(repository.create({ ...target, authorId: actor.id, body }));
        await this.attachments.insertRows(manager, { commentId: comment.id }, stored, actor);
        await this.audit.record(
          { userId: actor.id, entity: 'comment', entityId: comment.id, action: 'create', changes: { ...target, attachments: stored.map((file) => file.fileName) } },
          manager,
        );
        return comment.id;
      });
    } catch (error) {
      await this.attachments.discard(stored);
      throw error;
    }

    const comment = await this.comments.findOneOrFail({ where: { id }, relations: { author: true } });
    return toCommentView(comment, (await this.attachments.forComments([id])).get(id));
  }
}
