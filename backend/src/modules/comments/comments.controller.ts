import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseAnnouncementIdPipe } from '../announcement/parse-announcement-id.pipe';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ParseUserIdPipe } from '../users/parse-user-id.pipe';
import { CommentsService } from './comments.service';
import { CommentSavedResponseDto } from './dto/comment-saved.response.dto';
import { CommentsPageResponseDto } from './dto/comments-page.response.dto';
import { CreateCommentRequestDto } from './dto/create-comment.request.dto';
import { ListCommentsRequestDto } from './dto/list-comments.request.dto';
import { UpdateCommentRequestDto } from './dto/update-comment.request.dto';
import { ParseCommentIdPipe } from './parse-comment-id.pipe';

@ApiTags('Reviews')
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  // 3.2.14 Leaving reviews and ratings
  @Post('announcements/:id/comments')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Leave a review for the volunteer of a completed help request (SRS 3.2.14)',
  })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @Body() dto: CreateCommentRequestDto,
  ): Promise<CommentSavedResponseDto> {
    return this.comments.create(user, id, dto);
  }

  @Patch('comments/:id')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Edit my review within 24 hours (SRS 3.2.14)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseCommentIdPipe) id: number,
    @Body() dto: UpdateCommentRequestDto,
  ): Promise<CommentSavedResponseDto> {
    return this.comments.update(user, id, dto);
  }

  // 3.2.15 Reviews in the public profile - also available to guests
  @Get('users/:id/comments')
  @ApiOperation({
    summary: 'Reviews about a volunteer, 10 per page (SRS 3.2.15)',
  })
  list(
    @Param('id', ParseUserIdPipe) id: number,
    @Query() query: ListCommentsRequestDto,
  ): Promise<CommentsPageResponseDto> {
    return this.comments.listForUser(id, query);
  }
}
