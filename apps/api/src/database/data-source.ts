import 'dotenv/config';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { buildDatabaseOptions } from './database.config';

// Used by the TypeORM CLI (npm run migration:*). The app itself connects through AppModule.
validateEnv(process.env);

export default new DataSource(buildDatabaseOptions(process.env));
