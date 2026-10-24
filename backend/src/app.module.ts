import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { buildDataSourceOptions } from './config/database.config';

@Module({
  imports: [
    // environment files are loaded by ./config/env (".env.local" first, then ".env")
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [appConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        ...buildDataSourceOptions(config),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
