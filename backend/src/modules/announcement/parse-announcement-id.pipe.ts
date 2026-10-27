import { Injectable, PipeTransform } from '@nestjs/common';
import { AppException } from '../../common/errors';

/** A malformed id can never match an announcement: answer like "not found" (SRS 3.2.7.5). */
@Injectable()
export class ParseAnnouncementIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^\d{1,9}$/.test(value))
      throw new AppException('ANNOUNCEMENT_UNAVAILABLE');
    return Number(value);
  }
}
