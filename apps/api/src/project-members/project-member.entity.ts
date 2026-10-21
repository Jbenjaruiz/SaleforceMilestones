import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';

/**
 * Assigns a project to a user. Being assigned is what lets a non-administrator see the project («Ver»);
 * the three flags say what else they may do with its content. Administrators need no assignment.
 */
@Entity({ name: 'project_members' })
@Unique(['projectId', 'userId'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uniqueidentifier' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Relation<Project>;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'can_create', type: 'bit', default: false })
  canCreate: boolean;

  @Column({ name: 'can_update', type: 'bit', default: false })
  canUpdate: boolean;

  @Column({ name: 'can_delete', type: 'bit', default: false })
  canDelete: boolean;

  @Column({ name: 'created_by', type: 'uniqueidentifier' })
  createdBy: string;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()', update: false })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()' })
  updatedAt: Date;
}
