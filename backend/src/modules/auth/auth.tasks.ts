import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

/** Scheduled clean-up of accounts, tokens and sessions. */
@Injectable()
export class AuthTasks {
  private readonly logger = new Logger(AuthTasks.name);

  constructor(private readonly auth: AuthService) {}

  /** SRS 3.2.1.3 step 9. */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeUnverifiedAccounts(): Promise<void> {
    const removed = await this.auth.purgeUnverifiedAccounts();
    if (removed > 0)
      this.logger.log(
        `Deleted ${removed} account(s) that were not verified within 7 days`,
      );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredTokens(): Promise<void> {
    await this.auth.purgeExpiredTokens();
  }
}
