import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { PersonInNeed } from './entities/person-in-need.entity';
import { User } from './entities/user.entity';
import { Volunteer } from './entities/volunteer.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PersonInNeed, Volunteer]),
    StorageModule,
  ],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
