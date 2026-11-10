import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AuthModule } from '../auth/auth.module';
import { AnnouncementShare } from './entities/announcement-share.entity';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement, AnnouncementShare]),
    AuthModule,
  ],
  controllers: [SharingController],
  providers: [SharingService],
})
export class SharingModule {}
