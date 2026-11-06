import { Injectable } from '@nestjs/common';
import sharp, { ResizeOptions } from 'sharp';
import { AppException, ErrorCode } from '../../common/errors';

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
/** SRS 3.2.12.2: avatars up to 5 MB. */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
/** SRS 3.2.12.3 step 4: the avatar is resized to 256×256 px. */
export const AVATAR_SIZE = 256;
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
  sanitize(input: Buffer): Promise<SanitizedImage> {
    return this.process(input, MAX_PHOTO_BYTES, 'PHOTO_INVALID', {
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  /** Avatar: up to 5 MB, cropped to a 256×256 square, metadata removed (SRS 3.2.12.3 step 4). */
  sanitizeAvatar(input: Buffer): Promise<SanitizedImage> {
    return this.process(input, MAX_AVATAR_BYTES, 'AVATAR_INVALID', {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      fit: 'cover',
    });
  }

  private async process(
    input: Buffer,
    maxBytes: number,
    errorCode: ErrorCode,
    resize: ResizeOptions,
  ): Promise<SanitizedImage> {
    if (!input || input.length === 0 || input.length > maxBytes)
      throw new AppException(errorCode);

    try {
      const base = sharp(input, {
        failOn: 'error',
        limitInputPixels: MAX_INPUT_PIXELS,
      });
      const { format } = await base.metadata();
      // .rotate() applies the EXIF orientation first, so removing the metadata does not turn the picture sideways
      const pipeline = base.rotate().resize(resize);

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
          throw new AppException(errorCode);
      }
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw new AppException(errorCode);
    }
  }
}
