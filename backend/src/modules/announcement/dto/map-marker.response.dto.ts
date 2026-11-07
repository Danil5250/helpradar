import { AnnouncementType } from '../enums/announcement-type.enum';

/** SRS 3.2.18.3 step 4: what the short card of a marker needs. Only the approximate point is given out. */
export class MapMarkerResponseDto {
  id: number;
  type: AnnouncementType;
  title: string;
  category: { id: number; name: string };
  isUrgent: boolean;
  datePosted: string;
  distanceKm: number;
  approxLocation: { latitude: number; longitude: number };
}
