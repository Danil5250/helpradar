import { PartialType } from '@nestjs/swagger';
import { CreateCommentRequestDto } from './create-comment.request.dto';

/** SRS 3.2.14.3 step 6: the author can edit the review within 24 hours; every field is optional. */
export class UpdateCommentRequestDto extends PartialType(
  CreateCommentRequestDto,
) {}
