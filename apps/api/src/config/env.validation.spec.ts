import { validateEnv } from './env.validation';

const valid = {
  DB_HOST: 'db.example.com',
  DB_NAME: 'tracker',
  DB_USER: 'sa',
  DB_PASSWORD: 'secret',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts the required variables', () => {
    expect(validateEnv(valid)).toEqual(valid);
  });

  it('names every missing variable', () => {
    expect(() => validateEnv({ DB_HOST: 'db.example.com' })).toThrow(/DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET/);
  });

  it('treats empty values as missing', () => {
    expect(() => validateEnv({ ...valid, DB_PASSWORD: '' })).toThrow(/DB_PASSWORD/);
  });

  it('rejects a non-numeric port', () => {
    expect(() => validateEnv({ ...valid, DB_PORT: 'abc' })).toThrow(/DB_PORT/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET must have at least 32/);
  });
});
