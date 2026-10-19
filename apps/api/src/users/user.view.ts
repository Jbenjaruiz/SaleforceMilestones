import { User } from './user.entity';

/** What the API returns for a user: never the password hash. Expects `role` to be loaded. */
export interface UserView {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  role: { id: string; name: string };
  lastLoginAt: Date | null;
  createdAt: Date;
}

export const toUserView = (user: User): UserView => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  isActive: user.isActive,
  role: { id: user.role.id, name: user.role.name },
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});
