import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { buildDataSourceOptions } from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './common/common.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { StorageModule } from './modules/storage/storage.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    // environment files are loaded by ./config/env (".env.local" first, then ".env")
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [appConfig],
    }),
    // scheduled jobs (expiry, reminders, clean-up) can be switched off, e.g. for tests
    ...(process.env.DISABLE_SCHEDULER === 'true'
      ? []
      : [ScheduleModule.forRoot()]),
    TypeOrmModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        ...buildDataSourceOptions(config),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),
    CommonModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    StorageModule,
    GeocodingModule,
    AnnouncementModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
