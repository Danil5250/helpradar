import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { v } from '../../../common/validation';
import {
  MAX_EXPIRY_DAYS,
  MAX_EXTEND_DAYS,
  MIN_EXPIRY_DAYS,
} from '../announcement.constants';

const EXTEND = v(
  'EXTEND_INVALID',
  'You can extend an announcement by 1–14 days.',
);
const EXPIRY = v(
  'EXPIRY_INVALID',
  'The expiry period must be between 1 and 30 days.',
);

export class ExtendAnnouncementDto {
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

export class RepublishAnnouncementDto {
  @ApiPropertyOptional({
    minimum: MIN_EXPIRY_DAYS,
    maximum: MAX_EXPIRY_DAYS,
    default: 14,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt(EXPIRY)
  @Min(MIN_EXPIRY_DAYS, EXPIRY)
  @Max(MAX_EXPIRY_DAYS, EXPIRY)
  expiryDays?: number;
}
