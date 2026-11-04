import { AnnouncementDetailsResponseDto } from './announcement-details.response.dto';

/** Result of publishing, editing, closing, extending or republishing an announcement. */
export class AnnouncementActionResultResponseDto {
  code: string;
  message: string;
  announcement: AnnouncementDetailsResponseDto;
}
