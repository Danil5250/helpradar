import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers';
import { Category } from '../../categories/category.entity';
import { User } from '../../user/entities/user.entity';
import { Volunteer } from '../../user/entities/volunteer.entity';
import { AnnouncementPhoto } from './announcement-photo.entity';
import { AnnouncementStatus } from '../enums/announcement-status.enum';
import { AnnouncementType } from '../enums/announcement-type.enum';

const coordinate = {
  type: 'numeric',
  precision: 9,
  scale: 6,
  transformer: numericTransformer,
} as const;

/**
 * SRS 3.4.1 Announcement class (data store D2).
 *
 * Added columns that the SRS processing rules need but the class table does not list:
 * `approxLatitude`/`approxLongitude` (3.2.4.3 step 7: exact and approximate coordinates),
 * `closedAt` (3.2.5.3 step 6: republish within 30 days), `expiryReminderSentAt`
 * (3.2.5.3 step 5: reminder 24 hours before expiry) and `isFlaggedForModeration`
 * (3.2.4.3 step 9: stop-word matches are flagged).
 */
@Entity('announcements')
@Index('idx_announcements_status_expires', ['status', 'expiresAt'])
@Index('idx_announcements_user_status', ['userId', 'status'])
@Check('chk_announcements_latitude', '"latitude" BETWEEN -90 AND 90')
@Check('chk_announcements_longitude', '"longitude" BETWEEN -180 AND 180')
@Check('chk_announcements_expires_after_posted', '"expires_at" > "date_posted"')
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: AnnouncementType,
    enumName: 'announcement_type',
  })
  type: AnnouncementType;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  datePosted: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int', default: 0 })
  viewsCount: number;

  /** Address text entered by the author; the exact address is only shown to the author. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  currentLocation: string | null;

  /** Exact coordinates (never returned to other users). */
  @Column(coordinate)
  latitude: number;

  @Column(coordinate)
  longitude: number;

  /** Public coordinates, shifted by a random distance up to 300 m. */
  @Column(coordinate)
  approxLatitude: number;

  @Column(coordinate)
  approxLongitude: number;

  @Column({ type: 'int' })
  categoryId: number;

  @Column({ type: 'int', default: 0 })
  responsesCount: number;

  @Column({ type: 'boolean', default: false })
  isUrgent: boolean;

  @Column({
    type: 'enum',
    enum: AnnouncementStatus,
    enumName: 'announcement_status',
    default: AnnouncementStatus.Active,
  })
  status: AnnouncementStatus;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiryReminderSentAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isFlaggedForModeration: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int', nullable: true })
  volunteerWhoCompleteId: number | null;

  @ManyToOne(() => Category, (category) => category.announcements, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => User, (user) => user.announcements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Volunteer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'volunteer_who_complete_id' })
  volunteerWhoComplete: Volunteer | null;

  @OneToMany(() => AnnouncementPhoto, (photo) => photo.announcement)
  photos?: AnnouncementPhoto[];
}
