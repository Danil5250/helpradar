import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { v } from '../../../common/validation';

export enum CommentSort {
  Newest = 'newest',
  Rating = 'rating',
}

/** SRS 3.2.15.3 step 3: reviews in pages of 10, newest first or sorted by rating. */
export class ListCommentsRequestDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(v('PAGE_INVALID', 'Invalid page number.'))
  @Min(1, v('PAGE_INVALID', 'Invalid page number.'))
  page?: number;

  @ApiPropertyOptional({ enum: CommentSort, default: CommentSort.Newest })
  @IsOptional()
  @IsEnum(CommentSort, v('SORT_INVALID', 'Invalid sort order.'))
  sort?: CommentSort;
}
