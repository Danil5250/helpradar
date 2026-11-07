import { Injectable, PipeTransform } from '@nestjs/common';
import { AppException } from '../../common/errors';

/** A malformed id can never match a review: answer like "not found". */
@Injectable()
export class ParseCommentIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^\d{1,9}$/.test(value)) throw new AppException('REVIEW_NOT_FOUND');
    return Number(value);
  }
}
