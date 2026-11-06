import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EmailVerificationToken } from '../auth/entities/email-verification-token.entity';
import { Comment } from '../comments/entities/comment.entity';
import { StorageModule } from '../storage/storage.module';
import { User } from '../users/entities/user.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PublicProfileController } from './public-profile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EmailVerificationToken, Comment]),
    AuthModule,
    StorageModule,
  ],
  controllers: [ProfileController, PublicProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
