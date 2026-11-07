import { CommentAuthorResponseDto } from './comment-author.response.dto';

export class CommentResponseDto {
  id: number;
  rating: number;
  description: string;
  dateCreated: string;
  announcementId: number;
  author: CommentAuthorResponseDto;
}
