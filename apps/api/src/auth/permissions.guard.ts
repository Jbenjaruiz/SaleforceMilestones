import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCode } from '../roles/permissions';
import { AuthenticatedUser } from './authenticated-user';
import { ADMIN_ONLY_KEY, IS_PUBLIC_KEY, PERMISSION_KEY } from './decorators';

/** Global guard that runs after JwtAuthGuard: checks @AdminOnly() and @RequirePermission(). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, targets);
    const required = this.reflector.getAllAndOverride<PermissionCode>(PERMISSION_KEY, targets);
    if (!adminOnly && !required) return true;

    const user: AuthenticatedUser | undefined = context.switchToHttp().getRequest().user;
    if (user?.isAdmin) return true;
    if (adminOnly) throw new ForbiddenException('Only an administrator can do this.');
    if (user?.permissions.includes(required)) return true;

    throw new ForbiddenException(`Your role does not allow the "${required}" action.`);
  }
}
