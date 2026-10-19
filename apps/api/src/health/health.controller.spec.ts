import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

const controllerWith = (query: jest.Mock) => new HealthController({ query } as unknown as DataSource);

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const query = jest.fn().mockResolvedValue([{ ok: 1 }]);
    await expect(controllerWith(query).check()).resolves.toMatchObject({ status: 'ok', database: 'up' });
    expect(query).toHaveBeenCalledWith('SELECT 1 AS ok');
  });

  it('reports degraded, without leaking the error, when the database fails', async () => {
    const query = jest.fn().mockRejectedValue(new Error('Login failed for user sa'));
    const result = await controllerWith(query).check();
    expect(result).toMatchObject({ status: 'degraded', database: 'down' });
    expect(JSON.stringify(result)).not.toContain('Login failed');
  });
});
