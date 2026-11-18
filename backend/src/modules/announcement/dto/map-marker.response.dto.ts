import { AnnouncementType } from '../enums/announcement-type.enum';

/** Marker position and short request information for the interactive map. */
export class MapMarkerResponseDto {
  id: number;
  type: AnnouncementType;
  title: string;
  description: string;
  category: { id: number; name: string };
  isUrgent: boolean;
  datePosted: string;
  distanceKm: number;
  approxLocation: { latitude: number; longitude: number };
  location: { latitude: number; longitude: number };
}
