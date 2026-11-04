import { AnnouncementAction } from '../enums/announcement-action.type';
import { AnnouncementListItemResponseDto } from './announcement-list-item.response.dto';

/** Entry of "My announcements": the card plus the actions available to the author. */
export class OwnAnnouncementItemResponseDto extends AnnouncementListItemResponseDto {
  viewsCount: number;
  responsesCount: number;
  allowedActions: AnnouncementAction[];
  /** For closed announcements: the end of the 30-day republish period. */
  republishUntil: string | null;
}
