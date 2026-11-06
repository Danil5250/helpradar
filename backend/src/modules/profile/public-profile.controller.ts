import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUserIdPipe } from '../users/parse-user-id.pipe';
import { PublicProfileResponseDto } from './dto/public-profile.response.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@Controller('users')
export class PublicProfileController {
  constructor(private readonly profile: ProfileService) {}

  // 3.2.15 Viewing public profiles - also available to guests
  @Get(':id')
  @ApiOperation({ summary: 'Public profile of a user (SRS 3.2.15)' })
  getPublic(
    @Param('id', ParseUserIdPipe) id: number,
  ): Promise<PublicProfileResponseDto> {
    return this.profile.getPublic(id);
  }
}
