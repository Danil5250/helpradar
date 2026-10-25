import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from '../../config/app.config';
import { EmailOutbox } from './entities/email-outbox.entity';
import { createMailDriver } from './mail.drivers';
import { MailService } from './mail.service';
import { MAIL_DRIVER } from './mail.types';

@Module({
  imports: [TypeOrmModule.forFeature([EmailOutbox])],
  providers: [
    {
      provide: MAIL_DRIVER,
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) =>
        createMailDriver(config.mail),
    },
    MailService,
  ],
  exports: [MailService, MAIL_DRIVER],
})
export class MailModule {}
