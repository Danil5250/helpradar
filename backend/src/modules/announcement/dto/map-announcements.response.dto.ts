import { MapMarkerResponseDto } from './map-marker.response.dto';

export class MapAnnouncementsResponseDto {
  /** Sorted by distance from the center (SRS 3.2.19.3 step 4). */
  items: MapMarkerResponseDto[];
  /** "N announcements within [radius] km" (SRS 3.2.19.4). */
  total: number;
  radiusKm: number;
}
