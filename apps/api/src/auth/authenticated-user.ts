import { ADMIN_ROLE_NAME, PERMISSION_CODES, PermissionCode } from '../roles/permissions';
import { User } from '../users/user.entity';

/** What the guards attach to the request after validating the token. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isAdmin: boolean;
  permissions: PermissionCode[];
}

/** Expects `user.role.permissions` to be loaded. The Administrator holds every permission. */
export function toAuthenticatedUser(user: User): AuthenticatedUser {
  const isAdmin = user.role.name === ADMIN_ROLE_NAME;
  const granted = new Set(user.role.permissions?.map((permission) => permission.code) ?? []);

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roleId: user.roleId,
    roleName: user.role.name,
    isAdmin,
    permissions: PERMISSION_CODES.filter((code) => isAdmin || granted.has(code)),
  };
}
