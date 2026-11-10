import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseAnnouncementIdPipe } from '../announcement/parse-announcement-id.pipe';
import {
  IpRateLimit,
  IpRateLimitGuard,
} from '../auth/guards/ip-rate-limit.guard';
import { RecordShareDto } from './dto/sharing.dto';
import { SharingService } from './sharing.service';

@ApiTags('Sharing')
@Controller('announcements/:id')
export class SharingController {
  constructor(private readonly sharing: SharingService) {}

  @Post('shares')
  @HttpCode(200)
  @UseGuards(IpRateLimitGuard)
  @IpRateLimit(60)
  @ApiOperation({ summary: 'Record the selected sharing channel' })
  async record(
    @Param('id', ParseAnnouncementIdPipe) id: number,
    @Body() dto: RecordShareDto,
  ) {
    await this.sharing.record(id, dto.channel);
    return { code: 'ANNOUNCEMENT_SHARED' };
  }
}
