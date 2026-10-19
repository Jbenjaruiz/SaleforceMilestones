import { buildDatabaseOptions } from './database.config';

const env = { DB_HOST: 'db.example.com', DB_NAME: 'tracker', DB_USER: 'sa', DB_PASSWORD: 'secret' };

describe('buildDatabaseOptions', () => {
  it('uses SQL Server defaults: port 1433, encrypted, certificate validated', () => {
    const options = buildDatabaseOptions(env) as any;
    expect(options).toMatchObject({ type: 'mssql', host: 'db.example.com', port: 1433, database: 'tracker', synchronize: false });
    expect(options.options).toEqual({ encrypt: true, trustServerCertificate: false });
  });

  it('reads the port and the TLS flags from the environment', () => {
    const options = buildDatabaseOptions({
      ...env,
      DB_PORT: '14330',
      DB_ENCRYPT: 'false',
      DB_TRUST_SERVER_CERTIFICATE: 'true',
    }) as any;
    expect(options.port).toBe(14330);
    expect(options.options).toEqual({ encrypt: false, trustServerCertificate: true });
  });
});
