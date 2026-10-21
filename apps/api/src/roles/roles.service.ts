import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { User } from '../users/user.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { Permission } from './permission.entity';
import { PERMISSION_CODES, PermissionCode } from './permissions';
import { Role } from './role.entity';

export interface RoleView {
  id: string;
  name: string;
  description: string | null;
  isProtected: boolean;
  permissions: PermissionCode[];
  userCount: number;
}

const toRoleView = (role: Role, userCount: number): RoleView => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isProtected: role.isProtected,
  permissions: PERMISSION_CODES.filter((code) => role.permissions.some((permission) => permission.code === code)),
  userCount,
});

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async list(): Promise<RoleView[]> {
    const roles = await this.roles.find({ relations: { permissions: true }, order: { name: 'ASC' } });
    return Promise.all(roles.map(async (role) => toRoleView(role, await this.users.count({ where: { roleId: role.id } }))));
  }

  async get(id: string): Promise<RoleView> {
    const role = await this.findOrFail(id);
    return toRoleView(role, await this.users.count({ where: { roleId: id } }));
  }

  async create(dto: CreateRoleDto, actor: AuthenticatedUser): Promise<RoleView> {
    const name = dto.name.trim();
    if (await this.roles.exists({ where: { name } })) throw new ConflictException('A role with this name already exists.');

    const created = await this.dataSource.transaction(async (manager) => {
      const role = await manager.getRepository(Role).save(
        manager.getRepository(Role).create({ name, description: dto.description?.trim() || null, isProtected: false }),
      );
      const permissions = dto.permissions ?? [];
      if (permissions.length > 0) await manager.getRepository(Permission).insert(permissions.map((code) => ({ roleId: role.id, code })));
      await this.audit.record(
        { userId: actor.id, entity: 'role', entityId: role.id, action: 'create', changes: { name } },
        manager,
      );
      return role;
    });
    return this.get(created.id);
  }

  async update(id: string, dto: UpdateRoleDto, actor: AuthenticatedUser): Promise<RoleView> {
    const role = await this.findOrFail(id);
    if (role.isProtected) throw new BadRequestException('A protected role cannot be modified.');

    const name = dto.name?.trim();
    if (name && name !== role.name && (await this.roles.exists({ where: { name, id: Not(id) } }))) {
      throw new ConflictException('A role with this name already exists.');
    }

    const current = new Set(role.permissions.map((permission) => permission.code));
    const next = new Set(dto.permissions ?? current);
    const added = [...next].filter((code) => !current.has(code));
    const removed = [...current].filter((code) => !next.has(code));

    await this.dataSource.transaction(async (manager) => {
      const values = {
        ...(name ? { name } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      };
      // TypeORM throws on an empty UPDATE, which is what a permissions-only change would produce.
      if (Object.keys(values).length > 0) await manager.getRepository(Role).update(id, values);
      if (removed.length > 0) await manager.getRepository(Permission).delete(role.permissions.filter((p) => removed.includes(p.code)).map((p) => p.id));
      if (added.length > 0) await manager.getRepository(Permission).insert(added.map((code) => ({ roleId: id, code })));
      await this.audit.record(
        {
          userId: actor.id,
          entity: 'role',
          entityId: id,
          action: 'update',
          changes: { before: { name: role.name, permissions: [...current] }, after: { name: name ?? role.name, permissions: [...next] } },
        },
        manager,
      );
    });
    return this.get(id);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const role = await this.findOrFail(id);
    if (role.isProtected) throw new BadRequestException('A protected role cannot be deleted.');
    if ((await this.users.count({ where: { roleId: id } })) > 0) {
      throw new ConflictException('This role still has users. Reassign them before deleting it.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Role).delete(id); // its permissions go with it (ON DELETE CASCADE)
      await this.audit.record({ userId: actor.id, entity: 'role', entityId: id, action: 'delete', changes: { name: role.name } }, manager);
    });
  }

  private async findOrFail(id: string): Promise<Role> {
    const role = await this.roles.findOne({ where: { id }, relations: { permissions: true } });
    if (!role) throw new NotFoundException('Role not found.');
    return role;
  }
}
