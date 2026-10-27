import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import appConfig from '../../config/app.config';

export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Files are given out only through temporary signed URLs (SRS 3.5.4 "Files"). */
@Injectable()
export class SignedUrlService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  sign(
    key: string,
    ttlSeconds = SIGNED_URL_TTL_SECONDS,
    now = Date.now(),
  ): string {
    const expires = Math.floor(now / 1000) + ttlSeconds;
    return `/api/files/${key}?expires=${expires}&signature=${this.signature(key, expires)}`;
  }

  verify(
    key: string,
    expires: string | undefined,
    signature: string | undefined,
    now = Date.now(),
  ): boolean {
    const expiresAt = Number(expires);
    if (!signature || !Number.isInteger(expiresAt) || expiresAt * 1000 < now)
      return false;
    const expected = Buffer.from(this.signature(key, expiresAt));
    const actual = Buffer.from(signature);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private signature(key: string, expires: number): string {
    return createHmac('sha256', this.config.storage.urlSecret)
      .update(`${key}.${expires}`)
      .digest('hex');
  }
}
