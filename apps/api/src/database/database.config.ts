import { DataSourceOptions } from 'typeorm';

type Env = Record<string, string | undefined>;

const toBoolean = (value: string | undefined, fallback: boolean): boolean =>
  value === undefined || value === '' ? fallback : ['true', '1', 'yes'].includes(value.toLowerCase());

/** Single source of truth for the connection, shared by the Nest module and the migration CLI. */
export function buildDatabaseOptions(env: Env): DataSourceOptions {
  return {
    type: 'mssql',
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 1433),
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    connectionTimeout: 15_000,
    options: {
      encrypt: toBoolean(env.DB_ENCRYPT, true),
      trustServerCertificate: toBoolean(env.DB_TRUST_SERVER_CERTIFICATE, false),
    },
    // The schema only changes through versioned migrations.
    synchronize: false,
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  };
}
