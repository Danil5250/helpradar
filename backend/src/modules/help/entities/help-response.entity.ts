import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Announcement } from '../../announcement/entities/announcement.entity';
import { Volunteer } from '../../users/entities/volunteer.entity';
import { User } from '../../users/entities/user.entity';
import { AnnouncementStatus } from '../../announcement/enums/announcement-status.enum';

export type HelpResponseStatus = 'Pending' | 'Accepted' | 'Rejected';
export type HelpInitiator = 'volunteer' | 'requester';

@Entity('help_responses')
@Check(
  'CHK_help_response_source',
  '"announcement_id" IS NOT NULL OR "offer_id" IS NOT NULL',
)
@Check(
  'CHK_help_response_progress',
  "\"help_status\" IN ('InProgress', 'Completed')",
)
@Unique('UQ_help_response_request_volunteer', ['announcementId', 'volunteerId'])
@Index('idx_help_responses_volunteer', ['volunteerId', 'dateCreated'])
@Index('idx_help_responses_requester', ['requesterId', 'dateCreated'])
@Index('UQ_help_direct_offer_requester', ['offerId', 'requesterId'], {
  unique: true,
  where: '"announcement_id" IS NULL',
})
export class HelpResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  announcementId: number | null;

  @Column({ type: 'int' })
  requesterId: number;

  @Column({ type: 'int' })
  volunteerId: number;

  @Column({ type: 'int', nullable: true })
  offerId: number | null;

  @Column({ type: 'varchar', length: 16 })
  initiatedBy: HelpInitiator;

  @Column({ type: 'varchar', length: 16, default: 'Pending' })
  status: HelpResponseStatus;

  @Column({ type: 'varchar', length: 16, nullable: true })
  helpStatus:
    AnnouncementStatus.InProgress | AnnouncementStatus.Completed | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;

  @ManyToOne(() => Announcement, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @ManyToOne(() => Announcement, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'offer_id' })
  offer: Announcement | null;
}
