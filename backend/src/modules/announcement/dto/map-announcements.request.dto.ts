import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
} from 'class-validator';
import { v } from '../../../common/validation';
import {
  AnnouncementTypeFilter,
  RADIUS_INVALID,
  SEARCH_RADII_KM,
  type SearchRadiusKm,
} from './list-announcements.request.dto';

const COORDINATES = v('COORDINATES_INVALID', 'Invalid coordinates.');

/** SRS 3.2.18 / 3.2.19: announcements around a center point, for the map. */
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
