import 'reflect-metadata';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Permission } from '../roles/permission.entity';
import { ADMIN_ROLE_NAME, SYSTEM_ROLES } from '../roles/permissions';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';
import dataSource from './data-source';

export const MIN_PASSWORD_LENGTH = 7;
const BCRYPT_ROUNDS = 12;

export interface AdminCredentials {
  email: string;
  password: string;
}

/** Reads the initial administrator from the environment; the password is never stored in the repository. */
export function readAdminCredentials(env: Record<string, string | undefined>): AdminCredentials {
  const email = (env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD ?? '';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in apps/api/.env to create the initial administrator.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL is not a valid email address.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must have at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return { email, password };
}

/** Idempotent: creates the system roles, their permissions and the administrator if they are missing. */
export async function seed(ds: DataSource, env: Record<string, string | undefined>): Promise<string[]> {
  const admin = readAdminCredentials(env);
  const log: string[] = [];

  await ds.transaction(async (manager) => {
    const roles = manager.getRepository(Role);
    const permissions = manager.getRepository(Permission);

    for (const definition of SYSTEM_ROLES) {
      let role = await roles.findOne({ where: { name: definition.name } });
      if (!role) {
        role = await roles.save(
          roles.create({ name: definition.name, description: definition.description, isProtected: definition.isProtected }),
        );
        log.push(`role created: ${definition.name}`);
      }

      const existing = new Set((await permissions.find({ where: { roleId: role.id } })).map((p) => p.code));
      for (const code of definition.permissions.filter((c) => !existing.has(c))) {
        await permissions.save(permissions.create({ roleId: role.id, code }));
        log.push(`permission created: ${definition.name} -> ${code}`);
      }
    }

    const users = manager.getRepository(User);
    if (!(await users.findOne({ where: { email: admin.email } }))) {
      const adminRole = await roles.findOneOrFail({ where: { name: ADMIN_ROLE_NAME } });
      await users.save(
        users.create({
          email: admin.email,
          passwordHash: await bcrypt.hash(admin.password, BCRYPT_ROUNDS),
          fullName: 'Administrator',
          isActive: true,
          roleId: adminRole.id,
        }),
      );
      log.push(`administrator created: ${admin.email}`);
    }
  });

  return log;
}

async function main() {
  await dataSource.initialize();
  try {
    const log = await seed(dataSource, process.env);
    console.log(log.length > 0 ? log.join('\n') : 'Nothing to do: roles, permissions and administrator already exist.');
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
