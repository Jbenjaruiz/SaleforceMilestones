import { validateEnv } from './env.validation';

const valid = { DB_HOST: 'db.example.com', DB_NAME: 'tracker', DB_USER: 'sa', DB_PASSWORD: 'secret' };

describe('validateEnv', () => {
  it('accepts the required database variables', () => {
    expect(validateEnv(valid)).toEqual(valid);
  });

  it('names every missing variable', () => {
    expect(() => validateEnv({ DB_HOST: 'db.example.com' })).toThrow(/DB_NAME, DB_USER, DB_PASSWORD/);
  });

  it('treats empty values as missing', () => {
    expect(() => validateEnv({ ...valid, DB_PASSWORD: '' })).toThrow(/DB_PASSWORD/);
  });

  it('rejects a non-numeric port', () => {
    expect(() => validateEnv({ ...valid, DB_PORT: 'abc' })).toThrow(/DB_PORT/);
  });
});
