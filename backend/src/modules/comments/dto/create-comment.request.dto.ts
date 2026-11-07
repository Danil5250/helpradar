import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { v } from '../../../common/validation';

const RATING = v('RATING_REQUIRED', 'Please choose a rating from 1 to 5.');
const COMMENT = v(
  'COMMENT_TOO_LONG',
  'The comment can be up to 1000 characters.',
);

/** SRS 3.2.14.2 Inputs - leaving a review for the volunteer. */
export class CreateCommentRequestDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt(RATING)
  @Min(1, RATING)
  @Max(5, RATING)
  rating: number;

  @ApiPropertyOptional({ maxLength: 1000, example: 'Thank you for the help!' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(COMMENT)
  @MaxLength(1000, COMMENT)
  description?: string;
}
