import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import appConfig from '../../config/app.config';
import { FileStorage, LocalFileStorage } from './file-storage';
import { FilesController } from './files.controller';
import { ImageSanitizerService } from './image-sanitizer.service';
import { SignedUrlService } from './signed-url.service';
import { S3FileStorage } from './S3FileStorage';

@Module({
  controllers: [FilesController],
  providers: [
    {
      provide: FileStorage,
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => {
        //new LocalFileStorage(config.storage.dir),
        return new S3FileStorage(
        config.aws.region,
        config.aws.accessKeyId,
        config.aws.secretAccessKey,
        config.aws.bucket,
      );
      }
    },
    SignedUrlService,
    ImageSanitizerService,
  ],
  exports: [FileStorage, SignedUrlService, ImageSanitizerService],
})
export class StorageModule {}
