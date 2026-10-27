import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnnouncementService } from './announcement.service';

/** Time driven transitions of the announcement lifecycle (SRS 3.2.5.3, STD 4.2). */
@Injectable()
export class AnnouncementTasks {
  private readonly logger = new Logger(AnnouncementTasks.name);

  constructor(private readonly announcements: AnnouncementService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpired(): Promise<void> {
    const closed = await this.announcements.closeExpired();
    if (closed > 0) this.logger.log(`Closed ${closed} expired announcement(s)`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sendExpiryReminders(): Promise<void> {
    await this.announcements.sendExpiryReminders();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async deleteStaleClosed(): Promise<void> {
    const removed = await this.announcements.deleteStaleClosed();
    if (removed > 0)
      this.logger.log(
        `Deleted ${removed} announcement(s) after the 30-day republish period`,
      );
  }
}
