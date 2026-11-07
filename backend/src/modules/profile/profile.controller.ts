import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
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
import { MessageResponseDto } from '../../common/dto/message.response.dto';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { IpRateLimitGuard } from '../auth/guards/ip-rate-limit.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { MAX_AVATAR_BYTES } from '../storage/image-sanitizer.service';
import { AvatarUploadFilter } from './avatar-upload.filter';
import { ConfirmEmailChangeRequestDto } from './dto/confirm-email-change.request.dto';
import { ProfileUpdatedResponseDto } from './dto/profile-updated.response.dto';
import { ProfileResponseDto } from './dto/profile.response.dto';
import { UpdateProfileRequestDto } from './dto/update-profile.request.dto';
import { UploadAvatarResponseDto } from './dto/upload-avatar.response.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  // 3.2.12 Editing the personal profile
  @Get()
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'My profile (SRS 3.2.12)' })
  getOwn(@CurrentUser() user: AuthUser): Promise<ProfileResponseDto> {
    return this.profile.getOwn(user.id);
  }

  @Patch()
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary:
      'Edit my profile; a new e-mail becomes active after confirmation (SRS 3.2.12)',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileRequestDto,
  ): Promise<ProfileUpdatedResponseDto> {
    return this.profile.update(user, dto);
  }

  @Post('avatar')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  @UseFilters(AvatarUploadFilter)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_BYTES, files: 1, fields: 0 },
    }),
  )
  @ApiCookieAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Upload an avatar (JPEG, PNG or WebP, up to 5 MB; stored as 256×256)',
  })
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadAvatarResponseDto> {
    return this.profile.uploadAvatar(user, file);
  }

  @Post('confirm-email')
  @HttpCode(200)
  @UseGuards(IpRateLimitGuard)
  @ApiOperation({
    summary: 'Confirm a new e-mail address with the token from the e-mail',
  })
  confirmEmail(
    @Body() dto: ConfirmEmailChangeRequestDto,
  ): Promise<MessageResponseDto> {
    return this.profile.confirmEmailChange(dto.token);
  }
}
