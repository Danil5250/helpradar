import { AnnouncementStatus } from '../enums/announcement-status.enum';
import { AnnouncementType } from '../enums/announcement-type.enum';
import { AnnouncementAuthorResponseDto } from './announcement-author.response.dto';

/** Card in the announcement list (SRS 3.2.6.4). Contains only public data. */
export class AnnouncementListItemResponseDto {
  id: number;
  type: AnnouncementType;
  status: AnnouncementStatus;
  title: string;
  excerpt: string;
  category: { id: number; name: string };
  isUrgent: boolean;
  datePosted: string;
  expiresAt: string;
  distanceKm: number | null;
  author: AnnouncementAuthorResponseDto;
  approxLocation: { latitude: number; longitude: number };
  thumbnailUrl: string | null;
}
