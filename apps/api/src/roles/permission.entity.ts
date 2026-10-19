import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';
import { PermissionCode } from './permissions';
import { Role } from './role.entity';

@Entity({ name: 'permissions' })
@Unique(['roleId', 'code'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_id', type: 'uniqueidentifier' })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Relation<Role>;

  @Column({ type: 'nvarchar', length: 20 })
  code: PermissionCode;
}
