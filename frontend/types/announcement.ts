export type AnnouncementType = 'HelpRequest' | 'HelpOffer';
export type AnnouncementStatus = 'Active' | 'InProgress' | 'Completed' | 'Hidden' | 'Closed' | 'Deleted';
export type AnnouncementAction = 'edit' | 'close' | 'delete' | 'extend' | 'republish';

export interface Category {
  id: number;
  name: string;
}

export interface Author {
  id: number;
  name: string;
  avatarUrl: string;
  rating: number | null;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Photo {
  id: number;
  url: string;
}

export interface AnnouncementListItem {
  id: number;
  type: AnnouncementType;
  status: AnnouncementStatus;
  title: string;
  excerpt: string;
  category: Category;
  isUrgent: boolean;
  datePosted: string;
  expiresAt: string;
  distanceKm: number | null;
  author: Author;
  approxLocation: GeoPoint;
  thumbnailUrl: string | null;
}

export interface OwnAnnouncementItem extends AnnouncementListItem {
  viewsCount: number;
  responsesCount: number;
  allowedActions: AnnouncementAction[];
  republishUntil: string | null;
}

export interface AnnouncementDetails {
  id: number;
  type: AnnouncementType;
  status: AnnouncementStatus;
  title: string;
  description: string;
  category: Category;
  isUrgent: boolean;
  datePosted: string;
  expiresAt: string;
  createdAt: string;
  viewsCount: number;
  responsesCount: number;
  author: Author;
  photos: Photo[];
  approxLocation: GeoPoint;
  isOwner: boolean;
  exactLocation: (GeoPoint & { address: string | null }) | null;
  allowedActions: AnnouncementAction[];
  republishUntil: string | null;
  canReview: boolean;
}

export interface AnnouncementPage {
  items: AnnouncementListItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type AnnouncementSort = 'newest' | 'nearest' | 'urgent';

export type AnnouncementTypeFilter = 'helpOffer' | 'helpRequest';

export interface AnnouncementPayload {
  title: string;
  description: string;
  categoryId: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  expiryDays?: number;
  isUrgent?: boolean;
}

export interface PlaceSuggestion {
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
}

export interface LocationValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export const SEARCH_RADII_KM = [1, 3, 5, 10, 25, 50] as const;
export type SearchRadiusKm = (typeof SEARCH_RADII_KM)[number];

export interface MapMarker {
  id: number;
  type: AnnouncementType;
  title: string;
  category: Category;
  isUrgent: boolean;
  datePosted: string;
  distanceKm: number;
  approxLocation: GeoPoint;
}

export interface MapAnnouncements {
  items: MapMarker[];
  total: number;
  radiusKm: number;
}
