import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

/**
 * A milestone is a change control. Its dates, progress, delay and completion are derived
 * from its tasks and are never stored (F01 §4.3).
 */
@Entity({ name: 'milestones' })
@Unique(['projectId', 'code'])
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uniqueidentifier' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.milestones)
  @JoinColumn({ name: 'project_id' })
  project: Relation<Project>;

  /** Change-control code such as CC-C01 or CC-M01; unique within its project. */
  @Column({ type: 'nvarchar', length: 30 })
  code: string;

  @Column({ type: 'nvarchar', length: 300 })
  name: string;

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  description: string | null;

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

  @OneToMany(() => Task, (task) => task.milestone)
  tasks: Relation<Task[]>;
}
