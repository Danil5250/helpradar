import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Min,
} from 'class-validator';
import { v } from '../../../common/validation';
import { AnnouncementType } from '../enums/announcement-type.enum';

export enum AnnouncementSort {
  Newest = 'newest',
  Nearest = 'nearest',
  Urgent = 'urgent',
}

/** SRS 3.2.19.2: radius of the search, km. */
export const SEARCH_RADII_KM = [1, 3, 5, 10, 25, 50] as const;
export type SearchRadiusKm = (typeof SEARCH_RADII_KM)[number];
export const RADIUS_INVALID = v(
  'RADIUS_INVALID',
  'Choose a radius of 1, 3, 5, 10, 25 or 50 km.',
);

export enum AnnouncementTypeFilter {
  HelpOffer = 'helpOffer',
  HelpRequest = 'helpRequest',
}

export const ANNOUNCEMENT_TYPE_BY_FILTER: Record<
  AnnouncementTypeFilter,
  AnnouncementType
> = {
  [AnnouncementTypeFilter.HelpOffer]: AnnouncementType.HelpOffer,
  [AnnouncementTypeFilter.HelpRequest]: AnnouncementType.HelpRequest,
};

/** SRS 3.2.6.2 Inputs: sort order (newest, nearest, urgent first) and the current location. */
export class ListAnnouncementsRequestDto {
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

  @ApiPropertyOptional({
    enum: SEARCH_RADII_KM,
    description:
      'Radius search (SRS 3.2.19): only announcements within this distance from lat/lng; ignored without a location',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(SEARCH_RADII_KM, RADIUS_INVALID)
  radius?: SearchRadiusKm;

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
