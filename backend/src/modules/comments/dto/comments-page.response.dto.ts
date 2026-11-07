import { CommentResponseDto } from './comment.response.dto';

export class CommentsPageResponseDto {
  items: CommentResponseDto[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
