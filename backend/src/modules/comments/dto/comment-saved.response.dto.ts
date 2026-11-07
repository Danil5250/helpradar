import { CommentResponseDto } from './comment.response.dto';

export class CommentSavedResponseDto {
  code: string;
  message: string;
  comment: CommentResponseDto;
}
