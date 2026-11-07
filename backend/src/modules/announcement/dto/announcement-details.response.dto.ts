import { AnnouncementAction } from '../enums/announcement-action.type';
import { AnnouncementStatus } from '../enums/announcement-status.enum';
import { AnnouncementType } from '../enums/announcement-type.enum';
import { AnnouncementAuthorResponseDto } from './announcement-author.response.dto';
import { AnnouncementPhotoResponseDto } from './announcement-photo.response.dto';

/** Announcement page (SRS 3.2.7.4). The exact location is returned to the author only. */
export class AnnouncementDetailsResponseDto {
  id: number;
  type: AnnouncementType;
  status: AnnouncementStatus;
  title: string;
  description: string;
  category: { id: number; name: string };
  isUrgent: boolean;
  datePosted: string;
  expiresAt: string;
  createdAt: string;
  viewsCount: number;
  responsesCount: number;
  author: AnnouncementAuthorResponseDto;
  photos: AnnouncementPhotoResponseDto[];
  approxLocation: { latitude: number; longitude: number };
  isOwner: boolean;
  exactLocation: {
    latitude: number;
    longitude: number;
    address: string | null;
  } | null;
  allowedActions: AnnouncementAction[];
  republishUntil: string | null;
  /** The author of a completed request can leave a review for the volunteer (SRS 3.2.14.3 step 1). */
  canReview: boolean;
}
