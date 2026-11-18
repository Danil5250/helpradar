import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { v } from '../../../common/validation';
import {
  AnnouncementTypeFilter,
  RADIUS_INVALID,
  SEARCH_RADII_KM,
  type SearchRadiusKm,
} from './list-announcements.request.dto';

const COORDINATES = v('COORDINATES_INVALID', 'Invalid coordinates.');

/** Bounds select the visible map area; omitting them retains radius search. */
export class MapAnnouncementsRequestDto {
  @ApiProperty({ example: 50.4501, description: 'Latitude of the center' })
  @Type(() => Number)
  @IsLatitude(COORDINATES)
  lat: number;

  @ApiProperty({ example: 30.5234, description: 'Longitude of the center' })
  @Type(() => Number)
  @IsLongitude(COORDINATES)
  lng: number;

  @ApiProperty({ enum: SEARCH_RADII_KM, example: 10 })
  @Type(() => Number)
  @IsIn(SEARCH_RADII_KM, RADIUS_INVALID)
  radius: SearchRadiusKm;

  @ApiPropertyOptional({ description: 'Northern edge of the visible area' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude(COORDINATES)
  north?: number;

  @ApiPropertyOptional({ description: 'Southern edge of the visible area' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude(COORDINATES)
  south?: number;

  @ApiPropertyOptional({ description: 'Eastern edge; may cross the date line' })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude(COORDINATES)
  east?: number;

  @ApiPropertyOptional({ description: 'Western edge of the visible area' })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude(COORDINATES)
  west?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(v('PAGE_INVALID', 'Invalid page number.'))
  @Min(1, v('PAGE_INVALID', 'Invalid page number.'))
  page?: number;

  @ApiPropertyOptional({
    enum: AnnouncementTypeFilter,
    description:
      "Only announcements of this type: helpOffer (volunteers' offers) or helpRequest (requests of people in need). Omit to get both.",
  })
  @IsOptional()
  @IsEnum(
    AnnouncementTypeFilter,
    v('TYPE_INVALID', 'Invalid announcement type.'),
  )
  type?: AnnouncementTypeFilter;
}
