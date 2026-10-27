import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { MailModule } from '../email/mail.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { StorageModule } from '../storage/storage.module';
import { AnnouncementPhoto } from './entities/announcement-photo.entity';
import { AnnouncementController } from './announcement.controller';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementService } from './announcement.service';
import { AnnouncementTasks } from './announcement.tasks';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement, AnnouncementPhoto]),
    AuthModule,
    CategoriesModule,
    GeocodingModule,
    StorageModule,
    MailModule,
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, AnnouncementTasks, ModerationService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
