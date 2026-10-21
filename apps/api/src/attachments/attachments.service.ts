import { BadRequestException, ForbiddenException, Injectable, NotFoundException, PayloadTooLargeException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CoreAccessService } from '../core/core-access.service';
import { Attachment } from './attachment.entity';
import { AttachmentStorage } from './attachment-storage';
import { ATTACHMENT_MAX_BYTES, ATTACHMENTS_PER_PARENT, detectFileType, sanitizeFileName } from './file-rules';

export interface AttachmentView {
  id: string;
  taskId: string | null;
  commentId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: { id: string; fullName: string };
  createdAt: Date;
}

export interface PreparedFile {
  fileName: string;
  contentType: string;
  extension: string;
  size: number;
  buffer: Buffer;
}

export interface StoredFile {
  fileName: string;
  contentType: string;
  size: number;
  storageKey: string;
}

type Parent = { taskId: string } | { commentId: string };

export const toAttachmentView = (attachment: Attachment): AttachmentView => ({
  id: attachment.id,
  taskId: attachment.taskId,
  commentId: attachment.commentId,
  fileName: attachment.fileName,
  contentType: attachment.contentType,
  sizeBytes: Number(attachment.sizeBytes),
  uploadedBy: { id: attachment.uploadedByUser.id, fullName: attachment.uploadedByUser.fullName },
  createdAt: attachment.createdAt,
});

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment) private readonly attachments: Repository<Attachment>,
    private readonly storage: AttachmentStorage,
    private readonly access: CoreAccessService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Validation and storage (also used when a comment is created with files) ──────────

  /** Checks count, size and real file type. Nothing is written yet. */
  prepare(files: Express.Multer.File[] | undefined, alreadyAttached = 0): PreparedFile[] {
    const list = files ?? [];
    if (list.length === 0) return [];
    if (alreadyAttached + list.length > ATTACHMENTS_PER_PARENT) {
      throw new BadRequestException(`At most ${ATTACHMENTS_PER_PARENT} attachments are allowed here (${alreadyAttached} already attached).`);
    }

    return list.map((file) => {
      if (file.size > ATTACHMENT_MAX_BYTES) throw new PayloadTooLargeException('Each file can be at most 5 MB.');
      const detected = detectFileType(file.buffer);
      if (!detected) throw new BadRequestException('Only PNG, JPG, WebP and PDF files are allowed.');
      return { fileName: sanitizeFileName(file.originalname), contentType: detected.contentType, extension: detected.extension, size: file.size, buffer: file.buffer };
    });
  }

  /** Writes the files to disk. If one fails, the ones already written are removed. */
  async store(prepared: PreparedFile[]): Promise<StoredFile[]> {
    const stored: StoredFile[] = [];
    try {
      for (const file of prepared) {
        const storageKey = this.storage.newKey(file.extension);
        await this.storage.write(storageKey, file.buffer);
        stored.push({ fileName: file.fileName, contentType: file.contentType, size: file.size, storageKey });
      }
      return stored;
    } catch (error) {
      await this.discard(stored);
      throw error;
    }
  }

  discard(stored: StoredFile[]): Promise<void> {
    return this.storage.removeMany(stored.map((file) => file.storageKey));
  }

  /** Inserts the rows inside the caller's transaction, so they commit or roll back with it. */
  async insertRows(manager: EntityManager, parent: Parent, stored: StoredFile[], actor: AuthenticatedUser): Promise<void> {
    if (stored.length === 0) return;
    await manager.getRepository(Attachment).insert(
      stored.map((file) => ({
        ...parent,
        uploadedBy: actor.id,
        fileName: file.fileName,
        contentType: file.contentType,
        sizeBytes: String(file.size),
        storageKey: file.storageKey,
      })),
    );
  }

  /** Groups the attachments of several comments, for listing them together. */
  async forComments(commentIds: string[]): Promise<Map<string, AttachmentView[]>> {
    const grouped = new Map<string, AttachmentView[]>();
    if (commentIds.length === 0) return grouped;
    const rows = await this.attachments.find({ where: { commentId: In(commentIds) }, relations: { uploadedByUser: true }, order: { createdAt: 'ASC' } });
    for (const row of rows) grouped.set(row.commentId as string, [...(grouped.get(row.commentId as string) ?? []), toAttachmentView(row)]);
    return grouped;
  }

  // ── Attachments directly on a task ───────────────────────────────────────────────────

  async listForTask(taskId: string, actor: AuthenticatedUser): Promise<AttachmentView[]> {
    await this.access.task(taskId, actor, 'read');
    const rows = await this.attachments.find({ where: { taskId }, relations: { uploadedByUser: true }, order: { createdAt: 'ASC' } });
    return rows.map(toAttachmentView);
  }

  async uploadToTask(taskId: string, files: Express.Multer.File[] | undefined, actor: AuthenticatedUser): Promise<AttachmentView[]> {
    await this.access.task(taskId, actor, 'update');
    const prepared = this.prepare(files, await this.attachments.count({ where: { taskId } }));
    if (prepared.length === 0) throw new BadRequestException('Attach at least one file in the "files" field.');

    const stored = await this.store(prepared);
    try {
      await this.dataSource.transaction(async (manager) => {
        await this.insertRows(manager, { taskId }, stored, actor);
        await this.audit.record(
          { userId: actor.id, entity: 'attachment', entityId: taskId, action: 'create', changes: { taskId, files: stored.map((f) => f.fileName) } },
          manager,
        );
      });
    } catch (error) {
      await this.discard(stored); // the database refused: do not leave orphan files
      throw error;
    }
    return this.listForTask(taskId, actor);
  }

  // ── Download and delete ──────────────────────────────────────────────────────────────

  async download(id: string, actor: AuthenticatedUser): Promise<StreamableFile> {
    const attachment = await this.findOrFail(id);
    await this.assertVisible(attachment, actor, false);

    const stream = this.storage.open(attachment.storageKey);
    stream.on('error', () => stream.destroy()); // a missing file ends the response instead of crashing the process
    const inline = attachment.contentType.startsWith('image/');
    return new StreamableFile(stream, {
      type: attachment.contentType,
      length: Number(attachment.sizeBytes),
      disposition: `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
    });
  }

  /** Only whoever uploaded it, or an administrator. */
  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const attachment = await this.findOrFail(id);
    await this.assertVisible(attachment, actor, true);
    if (attachment.uploadedBy !== actor.id && !actor.isAdmin) {
      throw new ForbiddenException('Only whoever uploaded the file or an administrator can delete it.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Attachment).delete(id);
      await this.audit.record(
        { userId: actor.id, entity: 'attachment', entityId: id, action: 'delete', changes: { fileName: attachment.fileName, taskId: attachment.taskId, commentId: attachment.commentId } },
        manager,
      );
    });
    await this.storage.removeMany([attachment.storageKey]);
  }

  private async findOrFail(id: string): Promise<Attachment> {
    const attachment = await this.attachments.findOne({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found.');
    return attachment;
  }

  private async assertVisible(attachment: Attachment, actor: AuthenticatedUser, write: boolean): Promise<void> {
    if (attachment.taskId) await this.access.task(attachment.taskId, actor, 'read', write);
    else await this.access.comment(attachment.commentId as string, actor, 'read', write);
  }
}
