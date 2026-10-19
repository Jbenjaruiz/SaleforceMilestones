import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { todayIn } from './calendar';

/** The current calendar day, in the business time zone (APP_TIMEZONE), so delays do not depend on where the server runs. */
@Injectable()
export class ClockService {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.get<string>('APP_TIMEZONE') || 'America/Guatemala';
  }

  today(): string {
    return todayIn(this.timeZone);
  }
}
