import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env.validation';
import { buildDatabaseOptions } from './database/database.config';
import { HealthModule } from './health/health.module';

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
    HealthModule,
  ],
})
export class AppModule {}
