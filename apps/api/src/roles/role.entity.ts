import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { User } from '../users/user.entity';
import { Permission } from './permission.entity';

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  description: string | null;

  /** Protected roles cannot be deleted or lose their permissions. */
  @Column({ name: 'is_protected', type: 'bit', default: false })
  isProtected: boolean;

  @OneToMany(() => Permission, (permission) => permission.role)
  permissions: Relation<Permission[]>;

  @OneToMany(() => User, (user) => user.role)
  users: Relation<User[]>;
}
