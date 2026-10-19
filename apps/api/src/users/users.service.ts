import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { PasswordService } from '../auth/password';
import { ADMIN_ROLE_NAME } from '../roles/permissions';
import { Role } from '../roles/role.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { User } from './user.entity';
import { toUserView, UserView } from './user.view';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async list(): Promise<UserView[]> {
    const users = await this.users.find({ relations: { role: true }, order: { fullName: 'ASC' } });
    return users.map(toUserView);
  }

  async get(id: string): Promise<UserView> {
    return toUserView(await this.findOrFail(id));
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<UserView> {
    const email = dto.email.trim().toLowerCase();
    await this.findRoleOrFail(dto.roleId);
    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const created = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const user = await repository.save(
        repository.create({ email, fullName: dto.fullName.trim(), passwordHash, roleId: dto.roleId, isActive: true }),
      );
      await this.audit.record(
        { userId: actor.id, entity: 'user', entityId: user.id, action: 'create', changes: { email, fullName: user.fullName, roleId: dto.roleId } },
        manager,
      );
      return user;
    });
    return this.get(created.id);
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser): Promise<UserView> {
    const user = await this.findOrFail(id);

    if (dto.isActive === false && user.id === actor.id) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    const newRole = dto.roleId && dto.roleId !== user.roleId ? await this.findRoleOrFail(dto.roleId) : user.role;
    const wasActiveAdmin = user.isActive && user.role.name === ADMIN_ROLE_NAME;
    const staysActiveAdmin = (dto.isActive ?? user.isActive) && newRole.name === ADMIN_ROLE_NAME;
    if (wasActiveAdmin && !staysActiveAdmin) await this.assertAnotherActiveAdmin(user.id);

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const track = <K extends 'fullName' | 'roleId' | 'isActive'>(key: K, value: User[K] | undefined) => {
      if (value !== undefined && value !== user[key]) {
        before[key] = user[key];
        after[key] = value;
      }
    };
    track('fullName', dto.fullName?.trim());
    track('roleId', dto.roleId);
    track('isActive', dto.isActive);

    if (Object.keys(after).length > 0) {
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(User).update(id, { ...after, updatedAt: new Date() });
        await this.audit.record({ userId: actor.id, entity: 'user', entityId: id, action: 'update', changes: { before, after } }, manager);
      });
    }
    return this.get(id);
  }

  async resetPassword(id: string, password: string, actor: AuthenticatedUser): Promise<void> {
    await this.findOrFail(id);
    const passwordHash = await this.passwords.hash(password);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).update(id, { passwordHash, updatedAt: new Date() });
      // The new password is never written to the audit log.
      await this.audit.record({ userId: actor.id, entity: 'user', entityId: id, action: 'password_reset' }, manager);
    });
  }

  private async findOrFail(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id }, relations: { role: true } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async findRoleOrFail(id: string): Promise<Role> {
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found.');
    return role;
  }

  /** Prevents locking everyone out: at least one active administrator must remain. */
  private async assertAnotherActiveAdmin(excludingUserId: string): Promise<void> {
    const others = await this.users.count({
      where: { isActive: true, id: Not(excludingUserId), role: { name: ADMIN_ROLE_NAME } },
    });
    if (others === 0) throw new BadRequestException('There must always be at least one active administrator.');
  }
}
