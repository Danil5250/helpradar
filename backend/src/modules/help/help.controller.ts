import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseAnnouncementIdPipe } from '../announcement/parse-announcement-id.pipe';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import {
  HelpConnectionDto,
  HelpOverviewDto,
  RequestHelpDto,
} from './dto/help.dto';
import { HelpService } from './help.service';

@ApiTags('Help')
@ApiCookieAuth()
@UseGuards(SessionAuthGuard)
@Controller()
export class HelpController {
  constructor(private readonly help: HelpService) {}

  @Get('help')
  @ApiOperation({ summary: 'My help requests, responses and ongoing help' })
  mine(@CurrentUser() user: AuthUser): Promise<{ items: HelpConnectionDto[] }> {
    return this.help.mine(user);
  }

  @Get('announcements/:id/help')
  @ApiOperation({
    summary: 'Help actions and responses visible to me for an announcement',
  })
  overview(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ): Promise<HelpOverviewDto> {
    return this.help.overview(user, id);
  }

  @Post('announcements/:id/respond')
  @ApiOperation({ summary: 'Volunteer offers help on an active request' })
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ): Promise<HelpConnectionDto> {
    return this.help.respond(user, id);
  }

  @Post('announcements/:id/request-help')
  @ApiOperation({ summary: 'Send my request to the author of a help offer' })
  requestHelp(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @Body() dto: RequestHelpDto,
  ): Promise<HelpConnectionDto> {
    return this.help.requestHelp(user, id, dto.requestId);
  }

  @Post('help/:id/accept')
  @HttpCode(200)
  accept(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ): Promise<HelpConnectionDto> {
    return this.help.act(user, id, 'accept');
  }

  @Post('help/:id/decline')
  @HttpCode(200)
  decline(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ): Promise<HelpConnectionDto> {
    return this.help.act(user, id, 'decline');
  }

  @Post('help/:id/withdraw')
  @HttpCode(200)
  withdraw(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ): Promise<HelpConnectionDto> {
    return this.help.act(user, id, 'withdraw');
  }

  @Post('help/:id/complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Recipient confirms the help was received and can leave a review',
  })
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ): Promise<HelpConnectionDto> {
    return this.help.act(user, id, 'complete');
  }

  @Post('help/:id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseAnnouncementIdPipe) id: number,
  ): Promise<HelpConnectionDto> {
    return this.help.act(user, id, 'cancel');
  }
}
