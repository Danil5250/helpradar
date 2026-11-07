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
import { numericTransformer } from '../../../common/transformers';
import { Announcement } from '../../announcement/entities/announcement.entity';
import { User } from '../../users/entities/user.entity';
import { Volunteer } from '../../users/entities/volunteer.entity';

/**
 * SRS 3.4.2 Comment class: review and rating left by a person in need for a volunteer.
 * `description` holds up to 1000 characters, as required by SRS 3.2.14.2.
 */
@Entity('comments')
@Unique('UQ_comments_announcement_author', ['announcementId', 'authorId'])
@Index('idx_comments_volunteer_created', ['volunteerId', 'dateCreated'])
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    transformer: numericTransformer,
  })
  rating: number;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;

  @Column({ type: 'varchar', length: 1000, default: '' })
  description: string;

  @Column({ type: 'int' })
  authorId: number;

  @Column({ type: 'int' })
  volunteerId: number;

  @Column({ type: 'int' })
  announcementId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_id' })
  volunteer: Volunteer;

  @ManyToOne(() => Announcement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;
}
