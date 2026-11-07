import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationService } from '../announcement/moderation.service';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { User } from '../users/entities/user.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Volunteer, User]),
    AuthModule,
    StorageModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService, ModerationService],
  exports: [CommentsService],
})
export class CommentsModule {}
