import { readAdminCredentials } from './seed';

// seed.ts imports the data source, which validates the environment at load time.
jest.mock('./data-source', () => ({ __esModule: true, default: {} }));

describe('readAdminCredentials', () => {
  it('normalizes the email and keeps the password as given', () => {
    expect(readAdminCredentials({ ADMIN_EMAIL: '  Admin@Example.COM ', ADMIN_PASSWORD: 'secret1' })).toEqual({
      email: 'admin@example.com',
      password: 'secret1',
    });
  });

  it('requires both values', () => {
    expect(() => readAdminCredentials({ ADMIN_EMAIL: 'admin@example.com' })).toThrow(/ADMIN_EMAIL and ADMIN_PASSWORD/);
    expect(() => readAdminCredentials({ ADMIN_PASSWORD: 'secret1' })).toThrow(/ADMIN_EMAIL and ADMIN_PASSWORD/);
  });

  it('rejects an invalid email', () => {
    expect(() => readAdminCredentials({ ADMIN_EMAIL: 'not-an-email', ADMIN_PASSWORD: 'secret1' })).toThrow(/valid email/);
  });

  it('enforces the 7-character minimum', () => {
    expect(() => readAdminCredentials({ ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'abc123' })).toThrow(/at least 7/);
    expect(readAdminCredentials({ ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'abc1234' }).password).toBe('abc1234');
  });
});
