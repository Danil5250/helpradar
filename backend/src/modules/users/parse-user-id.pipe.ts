import { Injectable, PipeTransform } from '@nestjs/common';
import { AppException } from '../../common/errors';

/** A malformed id can never match a user: answer like "not found" (SRS 3.2.15.5). */
@Injectable()
export class ParseUserIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^\d{1,9}$/.test(value)) throw new AppException('USER_NOT_FOUND');
    return Number(value);
  }
}
