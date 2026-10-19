export const PERMISSION_CODES = ['read', 'create', 'update', 'delete'] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

export interface SystemRole {
  name: string;
  description: string;
  isProtected: boolean;
  permissions: readonly PermissionCode[];
}

/** Roles that exist from the first migration (F01 §6). Administrators can create more. */
export const ADMIN_ROLE_NAME = 'Administrator';

export const SYSTEM_ROLES: readonly SystemRole[] = [
  {
    name: ADMIN_ROLE_NAME,
    description: 'Full access, including users, roles, projects and imports.',
    isProtected: true,
    permissions: PERMISSION_CODES,
  },
  {
    name: 'Reviewer',
    description: 'Read-only access.',
    isProtected: false,
    permissions: ['read'],
  },
];
