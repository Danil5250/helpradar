import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Failed login counter of an account (SRS 3.2.2.5: 5 failed attempts within 15 minutes lock the account for 15 minutes). */
@Entity('login_attempts')
export class LoginAttempt {
  @PrimaryColumn({ type: 'int' })
  userId: number;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  windowStartedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
