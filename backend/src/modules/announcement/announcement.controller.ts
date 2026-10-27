import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  OptionalSessionGuard,
  SessionAuthGuard,
} from '../auth/guards/session-auth.guard';
import { MAX_PHOTO_BYTES } from '../storage/image-sanitizer.service';
import { AnnouncementService } from './announcement.service';
import {
  ExtendAnnouncementDto,
  RepublishAnnouncementDto,
} from './dto/announcement-actions.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { ListAnnouncementsQueryDto } from './dto/list-announcements.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ParseAnnouncementIdPipe } from './parse-announcement-id.pipe';
import { PhotoUploadFilter } from './photo-upload.filter';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcements: AnnouncementService) {}

  // 3.2.6 Browsing the announcement list - also available to guests
  @Get()
  @UseGuards(OptionalSessionGuard)
  @ApiOperation({ summary: 'Active announcements, 20 per page (SRS 3.2.6)' })
  findAll(@Query() query: ListAnnouncementsQueryDto) {
    return this.announcements.findAll(query);
  }

  // 3.2.5.3 step 1: "My announcements" (declared before ":id" so that it is not treated as an id)
  @Get('mine')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'My announcements (SRS 3.2.5)' })
  async findMine(@CurrentUser() user: AuthUser) {
    return { items: await this.announcements.findMine(user) };
  }

  // 3.2.7 Viewing announcement details - also available to guests
  @Get(':id')
  @UseGuards(OptionalSessionGuard)
  @ApiOperation({ summary: 'Announcement details (SRS 3.2.7)' })
  async findOne(
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @CurrentUser() user?: AuthUser,
  ) {
    return { announcement: await this.announcements.getDetails(id, user) };
  }

  // 3.2.4 Creating a help announcement
  @Post()
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Create a Help Request (Person in Need) or a Help Offer (Volunteer) (SRS 3.2.4)',
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return {
      code: 'ANNOUNCEMENT_PUBLISHED',
      message: 'Your announcement has been published.',
      announcement: await this.announcements.create(user, dto),
    };
  }

  // 3.2.5 Editing, closing and deleting an announcement
  @Patch(':id')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Edit an active announcement (SRS 3.2.5)' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return {
      code: 'CHANGES_SAVED',
      message: 'Changes saved.',
      announcement: await this.announcements.update(user, id, dto),
    };
  }

  @Post(':id/close')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Close an announcement' })
  async close(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ) {
    return {
      code: 'ANNOUNCEMENT_CLOSED',
      message: 'Announcement closed.',
      announcement: await this.announcements.close(user, id),
    };
  }

  @Post(':id/extend')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Extend the expiry date by up to 14 days' })
  async extend(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @Body() dto: ExtendAnnouncementDto,
  ) {
    return {
      code: 'ANNOUNCEMENT_EXTENDED',
      message: 'Announcement extended.',
      announcement: await this.announcements.extend(user, id, dto.days),
    };
  }

  @Post(':id/republish')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Publish a closed announcement again (within 30 days)',
  })
  async republish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @Body() dto: RepublishAnnouncementDto,
  ) {
    return {
      code: 'ANNOUNCEMENT_PUBLISHED',
      message: 'Your announcement has been published.',
      announcement: await this.announcements.republish(
        user,
        id,
        dto.expiryDays,
      ),
    };
  }

  @Delete(':id')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete an announcement (status Deleted)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ) {
    await this.announcements.remove(user, id);
    return { code: 'ANNOUNCEMENT_DELETED', message: 'Announcement deleted.' };
  }

  // Photos: uploaded one by one, so a wrong file never blocks the other photos (SRS 3.2.4.5)
  @Post(':id/photos')
  @UseGuards(SessionAuthGuard)
  @UseFilters(PhotoUploadFilter)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 },
    }),
  )
  @ApiCookieAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { photo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Attach a photo (JPEG, PNG or WebP, up to 10 MB, max. 5 per announcement)',
  })
  async addPhoto(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return { photo: await this.announcements.addPhoto(user, id, file) };
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Remove a photo' })
  async removePhoto(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @Param('photoId', ParseAnnouncementIdPipe) photoId: number,
  ) {
    await this.announcements.removePhoto(user, id, photoId);
    return { code: 'PHOTO_REMOVED', message: 'Photo removed.' };
  }
}
