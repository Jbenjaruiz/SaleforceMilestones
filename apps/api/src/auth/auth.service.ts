import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { User } from '../users/user.entity';
import { AuthenticatedUser, toAuthenticatedUser } from './authenticated-user';
import { PasswordService } from './password';

export interface LoginResult {
  accessToken: string;
  expiresIn: string;
  user: AuthenticatedUser;
}

const INVALID_CREDENTIALS = 'Invalid email or password.';

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.role', 'r')
      .leftJoinAndSelect('r.permissions', 'p')
      .where('u.email = :email', { email: email.trim().toLowerCase() })
      .getOne();

    // Always compare against a hash, even for unknown emails, so the response time does not reveal which emails exist.
    const matches = await this.passwords.verify(password, user?.passwordHash ?? (await this.getDummyHash()));

    if (!user || !matches) {
      if (user) await this.audit.record({ userId: user.id, entity: 'user', entityId: user.id, action: 'login_failed' });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      await this.audit.record({ userId: user.id, entity: 'user', entityId: user.id, action: 'login_blocked_inactive' });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.users.update(user.id, { lastLoginAt: new Date() });
    await this.audit.record({ userId: user.id, entity: 'user', entityId: user.id, action: 'login' });

    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || '8h';
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }, { expiresIn: expiresIn as never }),
      expiresIn,
      user: toAuthenticatedUser(user),
    };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwords.hash('not-a-real-password');
    return this.dummyHash;
  }
}
