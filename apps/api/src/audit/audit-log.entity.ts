import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { User } from '../users/user.entity';

/** Append-only record of who changed what and when. Rows are never updated or deleted. */
@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  /** milestone, task, comment, attachment, project, user, role, import… */
  @Column({ type: 'nvarchar', length: 50 })
  entity: string;

  @Column({ name: 'entity_id', type: 'uniqueidentifier', nullable: true })
  entityId: string | null;

  /** create, update, delete, complete, uncomplete, archive, import, login… */
  @Column({ type: 'nvarchar', length: 50 })
  action: string;

  /** Previous and new values, serialized as JSON text (SQL Server 2012 has no JSON type). */
  @Column({ name: 'changes_json', type: 'nvarchar', length: 'MAX', nullable: true })
  changesJson: string | null;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()', update: false })
  createdAt: Date;
}
