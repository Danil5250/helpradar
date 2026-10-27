import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsString, Length } from 'class-validator';
import { v } from '../../common/validation';
import {
  IpRateLimit,
  IpRateLimitGuard,
} from '../auth/guards/ip-rate-limit.guard';
import { GeocodingService } from './geocoding.service';

class PlaceQueryDto {
  @IsString(v('QUERY_TOO_SHORT', 'Enter at least 3 characters.'))
  @Length(3, 200, v('QUERY_TOO_SHORT', 'Enter at least 3 characters.'))
  q: string;
}

class ReverseQueryDto {
  @Type(() => Number)
  @IsLatitude(v('COORDINATES_INVALID', 'Invalid coordinates.'))
  lat: number;

  @Type(() => Number)
  @IsLongitude(v('COORDINATES_INVALID', 'Invalid coordinates.'))
  lng: number;
}

@ApiTags('Geocoding')
@Controller('geocoding')
@UseGuards(IpRateLimitGuard)
@IpRateLimit(60)
export class GeocodingController {
  constructor(private readonly geocoding: GeocodingService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Address autocomplete for the announcement location',
  })
  async search(@Query() query: PlaceQueryDto) {
    return { items: await this.geocoding.searchAddress(query.q) };
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Address of a point on the map' })
  async reverse(@Query() query: ReverseQueryDto) {
    return { place: await this.geocoding.reverse(query.lat, query.lng) };
  }
}
