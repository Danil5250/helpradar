import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * E-mails waiting to be delivered. When the e-mail service is unavailable the message stays here and is
 * retried (SRS 3.2.1.5: "the email is queued for another attempt").
 */
@Entity('email_outbox')
@Index('idx_email_outbox_pending', ['sentAt', 'nextAttemptAt'])
export class EmailOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 254 })
  toAddress: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  textBody: string;

  @Column({ type: 'text', nullable: true })
  htmlBody: string | null;

  @Column({ type: 'varchar', length: 50 })
  kind: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  nextAttemptAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
