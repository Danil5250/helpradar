import { AnnouncementListItemResponseDto } from './announcement-list-item.response.dto';

export class AnnouncementPageResponseDto {
  items: AnnouncementListItemResponseDto[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
