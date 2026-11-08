import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { AppException } from '../../common/errors';
import { ModerationService } from '../announcement/moderation.service';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AnnouncementStatus } from '../announcement/enums/announcement-status.enum';
import { AnnouncementType } from '../announcement/enums/announcement-type.enum';
import type { AuthUser } from '../auth/auth-user';
import { SignedUrlService } from '../storage/signed-url.service';
import { User } from '../users/entities/user.entity';
import { Volunteer } from '../users/entities/volunteer.entity';
import { Role } from '../users/enums/role.enum';
import { HelpResponse } from '../help/entities/help-response.entity';
import { CommentSavedResponseDto } from './dto/comment-saved.response.dto';
import { CommentResponseDto } from './dto/comment.response.dto';
import { CommentsPageResponseDto } from './dto/comments-page.response.dto';
import { CreateCommentRequestDto } from './dto/create-comment.request.dto';
import {
  CommentSort,
  ListCommentsRequestDto,
} from './dto/list-comments.request.dto';
import { UpdateCommentRequestDto } from './dto/update-comment.request.dto';
import { Comment } from './entities/comment.entity';

const DAY_MS = 24 * 60 * 60 * 1000;
/** SRS 3.2.14.3 step 3: a review can be left within 14 days after completion. */
export const REVIEW_PERIOD_MS = 14 * DAY_MS;
/** SRS 3.2.14.3 step 6: the author can edit the review within 24 hours. */
export const REVIEW_EDIT_MS = DAY_MS;
/** SRS 3.2.15.3 step 3: reviews are loaded in pages of 10. */
export const COMMENTS_PAGE_SIZE = 10;

@Injectable()
export class CommentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Volunteer)
    private readonly volunteers: Repository<Volunteer>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly moderation: ModerationService,
    private readonly signer: SignedUrlService,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // 3.2.14 Leaving reviews and ratings
  // ---------------------------------------------------------------------------------------------

  async create(
    user: AuthUser,
    announcementId: number,
    dto: CreateCommentRequestDto,
  ): Promise<CommentSavedResponseDto> {
    if (user.role !== Role.PersonInNeed)
      throw new AppException('REVIEW_NOT_ALLOWED');
    const description = dto.description ?? '';
    this.assertCleanText(description);

    const id = await this.dataSource.transaction(async (manager) => {
      // lock the announcement to prevent duplicate reviews.
      const announcement = await manager.findOne(Announcement, {
        where: { id: announcementId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!announcement || announcement.status === AnnouncementStatus.Deleted)
        throw new AppException('ANNOUNCEMENT_UNAVAILABLE');
      const context = await this.reviewContext(announcement, user.id, manager);
      if (!context) throw new AppException('REVIEW_NOT_ALLOWED');
      if (
        await manager.exists(Comment, {
          where: { announcementId, authorId: user.id },
        })
      )
        throw new AppException('REVIEW_EXISTS');
      if (!this.withinReviewPeriod(context.completedAt))
        throw new AppException('REVIEW_PERIOD_ENDED');

      const saved = await manager.save(
        manager.create(Comment, {
          rating: dto.rating,
          description,
          authorId: user.id,
          volunteerId: context.volunteerId,
          announcementId,
        }),
      );
      await this.recalculateRating(manager, saved.volunteerId);
      return saved.id;
    });

    return {
      code: 'REVIEW_SAVED',
      message: 'Thank you for your review!',
      comment: await this.getOne(id),
    };
  }

  async update(
    user: AuthUser,
    id: number,
    dto: UpdateCommentRequestDto,
  ): Promise<CommentSavedResponseDto> {
    if (dto.description !== undefined) this.assertCleanText(dto.description);

    await this.dataSource.transaction(async (manager) => {
      const comment = await manager.findOne(Comment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      // someone else's review is reported as missing, so that ids of other reviews are not revealed
      if (!comment || comment.authorId !== user.id)
        throw new AppException('REVIEW_NOT_FOUND');
      if (Date.now() - comment.dateCreated.getTime() > REVIEW_EDIT_MS)
        throw new AppException('REVIEW_EDIT_EXPIRED');

      if (dto.rating !== undefined) comment.rating = dto.rating;
      if (dto.description !== undefined) comment.description = dto.description;
      await manager.save(comment);
      await this.recalculateRating(manager, comment.volunteerId);
    });

    return {
      code: 'REVIEW_UPDATED',
      message: 'Review updated.',
      comment: await this.getOne(id),
    };
  }

  /** Used by the announcement page: shows the "Leave a review" button (SRS 3.2.14.3 step 1). */
  async canReview(
    announcement: Announcement,
    viewer: AuthUser | undefined,
  ): Promise<boolean> {
    if (!viewer || viewer.role !== Role.PersonInNeed) return false;
    if (announcement.status === AnnouncementStatus.Deleted) return false;
    const context = await this.reviewContext(announcement, viewer.id);
    if (!context || !this.withinReviewPeriod(context.completedAt)) return false;
    return !(await this.comments.exists({
      where: { announcementId: announcement.id, authorId: viewer.id },
    }));
  }

  // ---------------------------------------------------------------------------------------------
  // 3.2.15 Reviews in the public profile
  // ---------------------------------------------------------------------------------------------

  async listForUser(
    userId: number,
    query: ListCommentsRequestDto,
  ): Promise<CommentsPageResponseDto> {
    const page = query.page ?? 1;
    if (!(await this.users.exists({ where: { id: userId } })))
      throw new AppException('USER_NOT_FOUND');
    const volunteer = await this.volunteers.findOneBy({ userId });
    if (!volunteer)
      return { items: [], page, pageSize: COMMENTS_PAGE_SIZE, hasMore: false };

    const qb = this.comments
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.author', 'author')
      .where('c.volunteerId = :volunteerId', { volunteerId: volunteer.id });
    if (query.sort === CommentSort.Rating)
      qb.orderBy('c.rating', 'DESC').addOrderBy('c.dateCreated', 'DESC');
    else qb.orderBy('c.dateCreated', 'DESC');
    const rows = await qb
      .addOrderBy('c.id', 'DESC')
      .skip((page - 1) * COMMENTS_PAGE_SIZE)
      .take(COMMENTS_PAGE_SIZE + 1)
      .getMany();

    return {
      items: rows
        .slice(0, COMMENTS_PAGE_SIZE)
        .map((comment) => this.toDto(comment)),
      page,
      pageSize: COMMENTS_PAGE_SIZE,
      hasMore: rows.length > COMMENTS_PAGE_SIZE,
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------------------------

  // only a recipient of confirmed, completed help may review it.
  private async reviewContext(
    announcement: Announcement,
    userId: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<{ volunteerId: number; completedAt: Date } | null> {
    if (announcement.type === AnnouncementType.HelpRequest) {
      return announcement.userId === userId &&
        announcement.status === AnnouncementStatus.Completed &&
        announcement.volunteerWhoCompleteId !== null &&
        announcement.completedAt
        ? {
            volunteerId: announcement.volunteerWhoCompleteId,
            completedAt: announcement.completedAt,
          }
        : null;
    }
    const response = await manager.findOneBy(HelpResponse, {
      announcementId: IsNull(),
      offerId: announcement.id,
      requesterId: userId,
      status: 'Accepted',
      helpStatus: AnnouncementStatus.Completed,
    });
    return response?.completedAt
      ? { volunteerId: response.volunteerId, completedAt: response.completedAt }
      : null;
  }

  private withinReviewPeriod(completedAt: Date): boolean {
    return Date.now() - completedAt.getTime() <= REVIEW_PERIOD_MS;
  }

  /** SRS 3.2.14.3 step 4: the text is checked against the stop-word list. */
  private assertCleanText(text: string): void {
    if (text && this.moderation.containsStopWord(text))
      throw new AppException('REVIEW_TEXT_FORBIDDEN');
  }

  /** SRS 3.2.14.3 step 5: the average rating of the volunteer, rounded to 0.1. */
  private async recalculateRating(
    manager: EntityManager,
    volunteerId: number,
  ): Promise<void> {
    await manager.query(
      `UPDATE "volunteers" SET "rating" = (
         SELECT COALESCE(ROUND(AVG("rating"), 1), 0) FROM "comments" WHERE "volunteer_id" = $1
       ) WHERE "id" = $1`,
      [volunteerId],
    );
  }

  private async getOne(id: number): Promise<CommentResponseDto> {
    const comment = await this.comments.findOneOrFail({
      where: { id },
      relations: { author: true },
    });
    return this.toDto(comment);
  }

  private toDto(comment: Comment): CommentResponseDto {
    return {
      id: comment.id,
      rating: comment.rating,
      description: comment.description,
      dateCreated: comment.dateCreated.toISOString(),
      announcementId: comment.announcementId,
      author: {
        id: comment.author.id,
        name: `${comment.author.firstName} ${comment.author.lastName.charAt(0)}.`,
        avatarUrl: this.signer.resolve(comment.author.avatarUrl),
      },
    };
  }
}
