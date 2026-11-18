import type { AnnouncementDetails, AnnouncementType, Category } from '~/types/announcement';

export type ShareableAnnouncement = Pick<AnnouncementDetails, 'id' | 'title' | 'description' | 'type' | 'category' | 'status'>;

export type SocialChannel = 'telegram' | 'whatsapp' | 'viber' | 'x' | 'facebook' | 'email';
export type ShareChannel = SocialChannel | 'copy' | 'native';

export interface AnnouncementSharing {
  id: number;
  title: string;
  description: string;
  type: AnnouncementType;
  category: Category;
  url: string;
  imageUrl: string;
}
