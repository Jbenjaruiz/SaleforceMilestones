import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Role } from '../roles/role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 255, unique: true })
  email: string;

  /** Never selected by default: queries must ask for it explicitly (login only). */
  @Column({ name: 'password_hash', type: 'nvarchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'nvarchar', length: 150 })
  fullName: string;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive: boolean;

  @Column({ name: 'role_id', type: 'uniqueidentifier' })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Relation<Role>;

  @Column({ name: 'last_login_at', type: 'datetime2', precision: 3, nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'created_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()', update: false })
  createdAt: Date;

  /** Maintained by the services: SQL Server has no ON UPDATE for timestamps. */
  @Column({ name: 'updated_at', type: 'datetime2', precision: 3, default: () => 'SYSUTCDATETIME()' })
  updatedAt: Date;
}
