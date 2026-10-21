import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Milestone } from '../milestones/milestone.entity';
import { dateOnly } from '../database/transformers';
import { User } from '../users/user.entity';

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'milestone_id', type: 'uniqueidentifier' })
  milestoneId: string;

  @ManyToOne(() => Milestone, (milestone) => milestone.tasks)
  @JoinColumn({ name: 'milestone_id' })
  milestone: Relation<Milestone>;

  @Column({ type: 'nvarchar', length: 500 })
  name: string;

  /** Optional free text for now (not tied to a system user). */
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  responsible: string | null;

  @Column({ name: 'start_date', type: 'date', transformer: dateOnly })
  startDate: string;

  @Column({ name: 'estimated_date', type: 'date', transformer: dateOnly })
  estimatedDate: string;

  /** Set by the system when the task is checked (a new date on every check); cleared when unchecked. */
  @Column({ name: 'actual_date', type: 'date', nullable: true, transformer: dateOnly })
  actualDate: string | null;

  @Column({ name: 'is_completed', type: 'bit', default: false })
  isCompleted: boolean;

  /** F03: set by hand when the work is ready for the client to validate; cleared when the task is finished. */
  @Column({ name: 'ready_for_validation', type: 'bit', default: false })
  readyForValidation: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'created_by', type: 'uniqueidentifier' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: Relation<User>;

  @Column({ name: 'updated_by', type: 'uniqueidentifier', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: Relation<User> | null;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()', update: false })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()' })
  updatedAt: Date;
}
