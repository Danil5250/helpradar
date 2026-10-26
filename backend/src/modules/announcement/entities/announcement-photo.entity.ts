import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Announcement } from './announcement.entity';

/** Photo of an announcement (SRS 3.2.4.2, data store D7 "Files"). The file itself lives in the file storage. */
@Entity('announcement_photos')
export class AnnouncementPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  announcementId: number;

  /** Key of the file in the storage; the file is only served through temporary signed URLs. */
  @Column({ type: 'varchar', length: 100, unique: true })
  storageKey: string;

  @Column({ type: 'varchar', length: 50 })
  contentType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  @Column({ type: 'smallint', default: 0 })
  position: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Announcement, (announcement) => announcement.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;
}
