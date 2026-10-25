import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { EmailOutbox } from './entities/email-outbox.entity';
import type { MailDriver, OutgoingMail } from './mail.types';
import { MAIL_DRIVER } from './mail.types';

const MAX_ATTEMPTS = 10;
const BACKOFF_MINUTES = [1, 2, 5, 10, 30, 60, 120, 240, 360, 360];

/**
 * Persistent e-mail queue. A message is stored first (in the same transaction as the business
 * change) and delivered afterwards. If the e-mail service is down the message stays in the
 * outbox and is retried with a growing delay (SRS 3.2.1.5, D-2).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(EmailOutbox)
    private readonly outbox: Repository<EmailOutbox>,
    @Inject(MAIL_DRIVER) private readonly driver: MailDriver,
  ) {}

  /** Stores the message; call `deliver()` after the surrounding transaction has been committed. */
  async enqueue(
    manager: EntityManager,
    mail: OutgoingMail,
    kind: string,
  ): Promise<EmailOutbox> {
    return manager.save(
      manager.create(EmailOutbox, {
        toAddress: mail.to,
        subject: mail.subject,
        textBody: mail.text,
        htmlBody: mail.html ?? null,
        kind,
      }),
    );
  }

  /** Tries to send a queued message. Returns true when the message has been handed to the e-mail service. */
  async deliver(id: string): Promise<boolean> {
    // claim the row so that the immediate attempt and the retry job never send the same message twice
    const claimed: Array<Record<string, any>> = (
      await this.outbox.query(
        `UPDATE "email_outbox" SET "next_attempt_at" = now() + interval '5 minutes'
         WHERE "id" = $1 AND "sent_at" IS NULL AND "next_attempt_at" <= now() AND "attempts" < $2
         RETURNING "id", "to_address", "subject", "text_body", "html_body", "attempts"`,
        [id, MAX_ATTEMPTS],
      )
    )[0];
    if (!claimed || claimed.length === 0) return false;
    const row = claimed[0];

    try {
      await this.driver.send({
        to: row.to_address,
        subject: row.subject,
        text: row.text_body,
        html: row.html_body ?? undefined,
      });
      await this.outbox.update(id, {
        sentAt: new Date(),
        attempts: row.attempts + 1,
        lastError: null,
      });
      return true;
    } catch (error) {
      const attempts = row.attempts + 1;
      const delayMinutes =
        BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
      await this.outbox.update(id, {
        attempts,
        lastError: String((error as Error).message ?? error).slice(0, 1000),
        nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
      });
      this.logger.warn(
        `E-mail ${id} could not be sent (attempt ${attempts}): ${(error as Error).message}`,
      );
      return false;
    }
  }

  /** Retries messages whose delivery failed earlier. */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryPending(): Promise<number> {
    const due = await this.outbox
      .createQueryBuilder('mail')
      .select('mail.id')
      .where(
        'mail.sentAt IS NULL AND mail.nextAttemptAt <= now() AND mail.attempts < :max',
        { max: MAX_ATTEMPTS },
      )
      .orderBy('mail.nextAttemptAt', 'ASC')
      .limit(50)
      .getMany();
    let delivered = 0;
    for (const { id } of due) {
      if (await this.deliver(id)) delivered += 1;
    }
    return delivered;
  }

  /** Removes delivered messages after 30 days. */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeDelivered(): Promise<void> {
    await this.outbox.delete({
      sentAt: LessThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    });
  }
}
