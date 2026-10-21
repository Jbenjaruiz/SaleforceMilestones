import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { buildDatabaseOptions } from './database/database.config';
import { CommentsModule } from './comments/comments.module';
import { CoreModule } from './core/core.module';
import { HealthModule } from './health/health.module';
import { ImportsModule } from './imports/imports.module';
import { MilestonesModule } from './milestones/milestones.module';
import { ProjectMembersModule } from './project-members/project-members.module';
import { ProjectsModule } from './projects/projects.module';
import { RolesModule } from './roles/roles.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildDatabaseOptions(process.env),
        retryAttempts: 2,
        retryDelay: 1_500,
      }),
    }),
    // Generous global limit; sensitive routes (login) set a stricter one.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuditModule,
    AuthModule,
    CoreModule,
    UsersModule,
    RolesModule,
    ProjectsModule,
    ProjectMembersModule,
    MilestonesModule,
    TasksModule,
    CommentsModule,
    AttachmentsModule,
    ImportsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
