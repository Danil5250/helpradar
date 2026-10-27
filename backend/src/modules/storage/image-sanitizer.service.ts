import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { AppException } from '../../common/errors';

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 2560;
const MAX_INPUT_PIXELS = 50_000_000;

export interface SanitizedImage {
  data: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
}

/**
 * Validates an uploaded photo by its real content (not by the file name or the declared MIME type)
 * and re-encodes it, which removes all metadata including EXIF/GPS data (SRS 3.2.4.3 step 8, 3.5.4).
 */
@Injectable()
export class ImageSanitizerService {
  async sanitize(input: Buffer): Promise<SanitizedImage> {
    if (!input || input.length === 0 || input.length > MAX_PHOTO_BYTES)
      throw new AppException('PHOTO_INVALID');

    try {
      const base = sharp(input, {
        failOn: 'error',
        limitInputPixels: MAX_INPUT_PIXELS,
      });
      const { format } = await base.metadata();
      // .rotate() applies the EXIF orientation first, so removing the metadata does not turn the picture sideways
      const pipeline = base.rotate().resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });

      switch (format) {
        case 'jpeg':
          return {
            data: await pipeline.jpeg({ quality: 85 }).toBuffer(),
            contentType: 'image/jpeg',
            extension: 'jpg',
          };
        case 'png':
          return {
            data: await pipeline.png().toBuffer(),
            contentType: 'image/png',
            extension: 'png',
          };
        case 'webp':
          return {
            data: await pipeline.webp({ quality: 85 }).toBuffer(),
            contentType: 'image/webp',
            extension: 'webp',
          };
        default:
          throw new AppException('PHOTO_INVALID');
      }
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw new AppException('PHOTO_INVALID');
    }
  }
}
