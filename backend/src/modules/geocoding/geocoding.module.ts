import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeocodingController } from './geocoding.controller';
import { GeocodingProvider } from './geocoding.provider';
import { GeocodingService } from './geocoding.service';
import { NominatimProvider } from './nominatim.provider';

@Module({
  imports: [AuthModule],
  controllers: [GeocodingController],
  providers: [
    { provide: GeocodingProvider, useClass: NominatimProvider },
    GeocodingService,
  ],
  exports: [GeocodingService],
})
export class GeocodingModule {}
