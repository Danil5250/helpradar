import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../common/errors';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AnnouncementStatus } from '../announcement/enums/announcement-status.enum';
import { isBlocked } from '../users/users.service';
import { ShareChannel } from './dto/sharing.dto';
import { AnnouncementShare } from './entities/announcement-share.entity';

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcements: Repository<Announcement>,
    @InjectRepository(AnnouncementShare)
    private readonly shares: Repository<AnnouncementShare>,
  ) {}

  async record(id: number, channel: ShareChannel): Promise<void> {
    const announcement = await this.announcements.findOne({
      where: { id },
      relations: { user: true },
    });
    if (
      !announcement ||
      [AnnouncementStatus.Hidden, AnnouncementStatus.Deleted].includes(
        announcement.status,
      ) ||
      isBlocked(announcement.user)
    ) {
      throw new AppException('ANNOUNCEMENT_UNAVAILABLE');
    }
    // count share intents; external services do not confirm delivery.
    await this.shares.query(
      `INSERT INTO "announcement_shares" ("announcement_id", "channel", "count") VALUES ($1, $2, 1)
       ON CONFLICT ("announcement_id", "channel") DO UPDATE SET "count" = "announcement_shares"."count" + 1`,
      [id, channel],
    );
  }
}
