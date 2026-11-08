import type { UserRole } from '~/composables/useAuth';

export type SupportType = 'psychological' | 'humanitarian' | 'informational' | 'material';
export const SUPPORT_TYPES: SupportType[] = ['psychological', 'humanitarian', 'informational', 'material'];

export interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  pendingEmail: string | null;
  role: UserRole;
  phoneNumber: string | null;
  avatarUrl: string;
  city: string | null;
  region: string | null;
  street: string | null;
  aboutMe: string;
  supports: SupportType[];
  rating: number | null;
  reviewsCount: number;
  createdAt: string;
}

export interface ProfilePayload {
  firstName?: string;
  lastName?: string;
  city?: string;
  region?: string;
  street?: string;
  phoneNumber?: string;
  aboutMe?: string;
  supports?: SupportType[];
  email?: string;
  locale?: string;
}

export interface ProfileUpdated {
  code: string;
  message: string;
  profile: Profile;
  emailChange: { code: 'CHECK_EMAIL' | 'EMAIL_QUEUED'; message: string; emailQueued: boolean } | null;
}

export interface PublicProfile {
  id: number;
  name: string;
  avatarUrl: string;
  city: string | null;
  role: UserRole;
  rating: number | null;
  reviewsCount: number;
  registeredAt: string;
}

export interface Review {
  id: number;
  rating: number;
  description: string;
  dateCreated: string;
  announcementId: number;
  author: { id: number; name: string; avatarUrl: string };
}

export type ReviewSort = 'newest' | 'rating';

export interface ReviewPage {
  items: Review[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ReviewPayload {
  rating: number;
  description?: string;
}
