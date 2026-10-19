import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Comment } from '../comments/comment.entity';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

export const ATTACHMENT_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const;
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENTS_PER_PARENT = 5;

/** Belongs to a comment or directly to a task, never both (enforced by a CHECK). The file lives on disk. */
@Entity({ name: 'attachments' })
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id', type: 'uniqueidentifier', nullable: true })
  commentId: string | null;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'comment_id' })
  comment: Relation<Comment> | null;

  @Column({ name: 'task_id', type: 'uniqueidentifier', nullable: true })
  taskId: string | null;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Relation<Task> | null;

  @Column({ name: 'uploaded_by', type: 'uniqueidentifier' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser: Relation<User>;

  @Column({ name: 'file_name', type: 'nvarchar', length: 255 })
  fileName: string;

  @Column({ name: 'content_type', type: 'nvarchar', length: 100 })
  contentType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  /** Path relative to STORAGE_DIR. */
  @Column({ name: 'storage_key', type: 'nvarchar', length: 500 })
  storageKey: string;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()', update: false })
  createdAt: Date;
}
