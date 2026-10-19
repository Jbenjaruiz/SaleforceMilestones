import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    const database = await this.databaseStatus();
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  // The failure reason is not returned: this endpoint is reachable before authentication exists.
  private async databaseStatus(): Promise<'up' | 'down'> {
    try {
      await this.dataSource.query('SELECT 1 AS ok');
      return 'up';
    } catch {
      return 'down';
    }
  }
}
