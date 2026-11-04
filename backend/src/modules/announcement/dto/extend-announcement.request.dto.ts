import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { v } from '../../../common/validation';
import { MAX_EXTEND_DAYS } from '../announcement.constants';

const EXTEND = v(
  'EXTEND_INVALID',
  'You can extend an announcement by 1–14 days.',
);

export class ExtendAnnouncementRequestDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_EXTEND_DAYS,
    default: MAX_EXTEND_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt(EXTEND)
  @Min(1, EXTEND)
  @Max(MAX_EXTEND_DAYS, EXTEND)
  days?: number;
}
