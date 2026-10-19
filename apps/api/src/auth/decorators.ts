import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../roles/permissions';
import { AuthenticatedUser } from './authenticated-user';

export const IS_PUBLIC_KEY = 'auth:public';
export const ADMIN_ONLY_KEY = 'auth:admin-only';
export const PERMISSION_KEY = 'auth:permission';

/** The route needs no session. Everything else requires one by default. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Only the Administrator role (users, roles, projects, imports). */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY_KEY, true);

/** read | create | update | delete. The Administrator always passes. */
export const RequirePermission = (code: PermissionCode) => SetMetadata(PERMISSION_KEY, code);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => context.switchToHttp().getRequest().user,
);
