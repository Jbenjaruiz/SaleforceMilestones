import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Milestone } from '../milestones/milestone.entity';
import { User } from '../users/user.entity';

/** Groups milestones. It has no due date and several can be active at once (F01 §4.3). */
@Entity({ name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 200 })
  name: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  description: string | null;

  /** «Deleting» a project archives it: hidden from the selector, data kept. */
  @Column({ name: 'is_archived', type: 'bit', default: false })
  isArchived: boolean;

  @Column({ name: 'archived_at', type: 'datetime2', precision: 3, nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'archived_by', type: 'uniqueidentifier', nullable: true })
  archivedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'archived_by' })
  archivedByUser: Relation<User> | null;

  @Column({ name: 'created_by', type: 'uniqueidentifier' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: Relation<User>;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()', update: false })
  createdAt: Date;

  @OneToMany(() => Milestone, (milestone) => milestone.project)
  milestones: Relation<Milestone[]>;
}
