import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/errors';
import { GeoPoint } from '../../common/utils/geo';
import { GeocodingProvider, PlaceSuggestion } from './geocoding.provider';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

/** Geocoding with caching (SRS 2.4: the number of external map API calls must be reduced by caching). */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();

  constructor(private readonly provider: GeocodingProvider) {}

  /** Address autocomplete; fails with GEOCODER_UNAVAILABLE when the external service cannot be reached. */
  async searchAddress(query: string): Promise<PlaceSuggestion[]> {
    const normalized = query.trim();
    return this.cached(`address:${normalized.toLowerCase()}`, async () => {
      try {
        return await this.provider.search(normalized, { limit: 6 });
      } catch (error) {
        this.logger.warn(`Geocoder search failed: ${(error as Error).message}`);
        throw new AppException('GEOCODER_UNAVAILABLE');
      }
    });
  }

  /** SRS 3.2.4.3 step 6: converts an address entered by the user into coordinates. */
  async geocodeAddress(address: string): Promise<GeoPoint | null> {
    const [first] = await this.searchAddress(address);
    return first
      ? { latitude: first.latitude, longitude: first.longitude }
      : null;
  }

  /** Address of a point (used after "current location" or a click on the map); null when unavailable. */
  async reverse(
    latitude: number,
    longitude: number,
  ): Promise<PlaceSuggestion | null> {
    const key = `reverse:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    try {
      return await this.cached(key, () =>
        this.provider.reverse(latitude, longitude),
      );
    } catch (error) {
      this.logger.warn(`Reverse geocoding failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
    const value = await load();
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  }
}
