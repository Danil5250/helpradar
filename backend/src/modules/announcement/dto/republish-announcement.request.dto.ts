import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { v } from '../../../common/validation';
import { MAX_EXPIRY_DAYS, MIN_EXPIRY_DAYS } from '../announcement.constants';

const EXPIRY = v(
  'EXPIRY_INVALID',
  'The expiry period must be between 1 and 30 days.',
);

export class RepublishAnnouncementRequestDto {
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
