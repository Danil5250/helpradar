import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Announcement } from '../../announcement/entities/announcement.entity';
import type { ShareChannel } from '../dto/sharing.dto';

@Entity('announcement_shares')
export class AnnouncementShare {
  @PrimaryColumn({ type: 'int' })
  announcementId: number;

  @PrimaryColumn({ type: 'varchar', length: 16 })
  channel: ShareChannel;

  @Column({ type: 'int', default: 0 })
  count: number;

  @ManyToOne(() => Announcement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;
}
