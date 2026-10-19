import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { toAuthenticatedUser } from './authenticated-user';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * Global guard: every route needs a valid bearer token unless it is marked @Public().
 * The user is reloaded on every request so deactivating an account or changing a role takes effect immediately.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.bearerToken(request.headers?.authorization);
    if (!token) throw new UnauthorizedException('Missing access token.');

    let userId: string;
    try {
      userId = (await this.jwt.verifyAsync<{ sub: string }>(token)).sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    const user = await this.users.findOne({ where: { id: userId }, relations: { role: { permissions: true } } });
    if (!user || !user.isActive) throw new UnauthorizedException('This account is not active.');

    request.user = toAuthenticatedUser(user);
    return true;
  }

  private bearerToken(header?: string): string | null {
    const [scheme, token] = (header ?? '').split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
