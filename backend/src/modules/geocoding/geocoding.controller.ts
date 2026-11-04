import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IpRateLimit,
  IpRateLimitGuard,
} from '../auth/guards/ip-rate-limit.guard';
import { ReverseGeocodeRequestDto } from './dto/reverse-geocode.request.dto';
import { SearchAddressRequestDto } from './dto/search-address.request.dto';
import { GeocodingService } from './geocoding.service';

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
  async search(@Query() query: SearchAddressRequestDto) {
    return { items: await this.geocoding.searchAddress(query.q) };
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Address of a point on the map' })
  async reverse(@Query() query: ReverseGeocodeRequestDto) {
    return { place: await this.geocoding.reverse(query.lat, query.lng) };
  }
}
