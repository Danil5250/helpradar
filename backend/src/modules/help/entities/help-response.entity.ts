import {
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

export type HelpResponseStatus =
  'Pending' | 'Accepted' | 'Declined' | 'Withdrawn';
export type HelpInitiator = 'volunteer' | 'requester';

@Entity('help_responses')
@Unique('UQ_help_response_request_volunteer', ['announcementId', 'volunteerId'])
@Index('idx_help_responses_volunteer', ['volunteerId', 'dateCreated'])
export class HelpResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  announcementId: number;

  @Column({ type: 'int' })
  volunteerId: number;

  @Column({ type: 'int', nullable: true })
  offerId: number | null;

  @Column({ type: 'varchar', length: 16 })
  initiatedBy: HelpInitiator;

  @Column({ type: 'varchar', length: 16, default: 'Pending' })
  status: HelpResponseStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;

  @ManyToOne(() => Announcement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @ManyToOne(() => Announcement, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'offer_id' })
  offer: Announcement | null;
}
