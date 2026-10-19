import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Milestone } from '../milestones/milestone.entity';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

/** A comment belongs to a milestone or to a task, never both (enforced by a CHECK). Comments are not edited. */
@Entity({ name: 'comments' })
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'milestone_id', type: 'uniqueidentifier', nullable: true })
  milestoneId: string | null;

  @ManyToOne(() => Milestone, { nullable: true })
  @JoinColumn({ name: 'milestone_id' })
  milestone: Relation<Milestone> | null;

  @Column({ name: 'task_id', type: 'uniqueidentifier', nullable: true })
  taskId: string | null;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Relation<Task> | null;

  @Column({ name: 'author_id', type: 'uniqueidentifier' })
  authorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>;

  @Column({ type: 'nvarchar', length: 'MAX' })
  body: string;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()', update: false })
  createdAt: Date;
}
