import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppException } from '../../common/errors';
import { FileStorage, STORAGE_KEY_REGEX } from './file-storage';
import { SignedUrlService } from './signed-url.service';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Serves stored photos, but only with a valid, unexpired signature. */
@ApiExcludeController()
@Controller('files')
export class FilesController {
  constructor(
    private readonly storage: FileStorage,
    private readonly signer: SignedUrlService,
  ) {}

  @Get(':key')
  async download(
    @Param('key') key: string,
    @Query('expires') expires: string | undefined,
    @Query('signature') signature: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (
      !STORAGE_KEY_REGEX.test(key) ||
      !this.signer.verify(key, expires, signature)
    ) {
      throw new AppException('FILE_LINK_INVALID');
    }
    const data = await this.storage.read(key);
    if (!data) throw new AppException('FILE_LINK_INVALID');

    res.set({
      'Content-Type': CONTENT_TYPES[key.split('.').pop() as string],
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(data);
  }
}
