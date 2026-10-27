import { AnnouncementStatus } from './enums/announcement-status.enum';
import { AnnouncementType } from './enums/announcement-type.enum';

export type AnnouncementAction =
  'edit' | 'close' | 'delete' | 'extend' | 'republish';

export interface PhotoView {
  id: number;
  /** Temporary signed URL (SRS 3.5.4). */
  url: string;
}

interface AuthorView {
  id: number;
  /** First name and the initial of the last name. */
  name: string;
  /** Volunteer rating; null for persons in need. */
  rating: number | null;
}

/** Card in the announcement list (SRS 3.2.6.4). Contains only public data. */
export interface AnnouncementListItem {
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
  author: AuthorView;
  approxLocation: { latitude: number; longitude: number };
  thumbnailUrl: string | null;
}

/** Entry of "My announcements": the card plus the actions available to the author. */
export interface OwnAnnouncementItem extends AnnouncementListItem {
  viewsCount: number;
  responsesCount: number;
  allowedActions: AnnouncementAction[];
  /** For closed announcements: the end of the 30-day republish period. */
  republishUntil: string | null;
}

/** Announcement page (SRS 3.2.7.4). The exact location is returned to the author only. */
export interface AnnouncementDetails {
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
  author: AuthorView;
  photos: PhotoView[];
  approxLocation: { latitude: number; longitude: number };
  isOwner: boolean;
  exactLocation: {
    latitude: number;
    longitude: number;
    address: string | null;
  } | null;
  allowedActions: AnnouncementAction[];
  republishUntil: string | null;
}

export interface AnnouncementPage {
  items: AnnouncementListItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
