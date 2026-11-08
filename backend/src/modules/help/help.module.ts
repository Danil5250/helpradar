import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AuthModule } from '../auth/auth.module';
import { CommentsModule } from '../comments/comments.module';
import { Comment } from '../comments/entities/comment.entity';
import { StorageModule } from '../storage/storage.module';
import { Volunteer } from '../users/entities/volunteer.entity';
import { HelpResponse } from './entities/help-response.entity';
import { HelpController } from './help.controller';
import { HelpService } from './help.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement, HelpResponse, Volunteer, Comment]),
    AuthModule,
    CommentsModule,
    StorageModule,
  ],
  controllers: [HelpController],
  providers: [HelpService],
})
export class HelpModule {}
