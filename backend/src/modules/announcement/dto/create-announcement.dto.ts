import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { v } from '../../../common/validation';
import {
  DEFAULT_EXPIRY_DAYS,
  MAX_EXPIRY_DAYS,
  MIN_EXPIRY_DAYS,
} from '../announcement.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const TITLE = v('TITLE_INVALID', 'Title must be 5–100 characters.');
const DESCRIPTION = v(
  'DESCRIPTION_INVALID',
  'Description must be 10–2000 characters.',
);
const CATEGORY = v('CATEGORY_INVALID', 'Choose a category from the list.');
const EXPIRY = v(
  'EXPIRY_INVALID',
  'The expiry period must be between 1 and 30 days.',
);
const LOCATION = v('LOCATION_INVALID', 'The location is not valid.');

/** SRS 3.2.4.2 Inputs - creating a help announcement. */
export class CreateAnnouncementDto {
  @ApiProperty({
    example: 'Need medicines for my mother',
    minLength: 5,
    maxLength: 100,
  })
  @Transform(trim)
  @IsString(TITLE)
  @Length(5, 100, TITLE)
  title: string;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @Transform(trim)
  @IsString(DESCRIPTION)
  @Length(10, 2000, DESCRIPTION)
  description: string;

  @ApiProperty({ example: 2, description: 'Category id (Appendix A.2)' })
  @Type(() => Number)
  @IsInt(CATEGORY)
  @Min(1, CATEGORY)
  categoryId: number;

  @ApiPropertyOptional({
    example: 'Shevchenka St 1, Lviv',
    description: 'Address text; geocoded when no coordinates are sent',
  })
  @IsOptional()
  @Transform(trim)
  @IsString(LOCATION)
  @MaxLength(255, LOCATION)
  address?: string;

  @ApiPropertyOptional({ example: 49.8397 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude(LOCATION)
  latitude?: number;

  @ApiPropertyOptional({ example: 24.0297 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude(LOCATION)
  longitude?: number;

  @ApiPropertyOptional({
    minimum: MIN_EXPIRY_DAYS,
    maximum: MAX_EXPIRY_DAYS,
    default: DEFAULT_EXPIRY_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt(EXPIRY)
  @Min(MIN_EXPIRY_DAYS, EXPIRY)
  @Max(MAX_EXPIRY_DAYS, EXPIRY)
  expiryDays?: number;

  @ApiPropertyOptional({ description: 'Help requests only' })
  @IsOptional()
  @IsBoolean(v('URGENT_INVALID', 'Invalid value.'))
  isUrgent?: boolean;
}
