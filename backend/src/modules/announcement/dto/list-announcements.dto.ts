import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Min,
} from 'class-validator';
import { v } from '../../../common/validation';

export enum AnnouncementSort {
  Newest = 'newest',
  Nearest = 'nearest',
  Urgent = 'urgent',
}

/** SRS 3.2.6.2 Inputs: sort order (newest, nearest, urgent first) and the current location. */
export class ListAnnouncementsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(v('PAGE_INVALID', 'Invalid page number.'))
  @Min(1, v('PAGE_INVALID', 'Invalid page number.'))
  page?: number;

  @ApiPropertyOptional({
    enum: AnnouncementSort,
    default: AnnouncementSort.Newest,
  })
  @IsOptional()
  @IsEnum(AnnouncementSort, v('SORT_INVALID', 'Invalid sort order.'))
  sort?: AnnouncementSort;

  @ApiPropertyOptional({
    description:
      'Latitude of the current location (used for distance and "nearest" sorting)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude(v('COORDINATES_INVALID', 'Invalid coordinates.'))
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude(v('COORDINATES_INVALID', 'Invalid coordinates.'))
  lng?: number;
}
