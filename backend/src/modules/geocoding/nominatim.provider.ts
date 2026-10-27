import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import appConfig from '../../config/app.config';
import {
  GeocodingProvider,
  PlaceSuggestion,
  SearchOptions,
} from './geocoding.provider';

interface NominatimItem {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
}

/** OpenStreetMap Nominatim (free, no API key). Its usage policy allows at most one request per second. */
@Injectable()
export class NominatimProvider extends GeocodingProvider {
  private static readonly MIN_INTERVAL_MS = 1000;
  private static readonly TIMEOUT_MS = 5000;
  private queue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    super();
  }

  async search(
    query: string,
    options: SearchOptions,
  ): Promise<PlaceSuggestion[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(options.limit),
      'accept-language': 'uk,en',
    });
    if (this.config.geocoder.countryCodes)
      params.set('countrycodes', this.config.geocoder.countryCodes);
    const items = await this.request<NominatimItem[]>(`/search?${params}`);
    return items.map((item) => this.toSuggestion(item));
  }

  async reverse(
    latitude: number,
    longitude: number,
  ): Promise<PlaceSuggestion | null> {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
      'accept-language': 'uk,en',
    });
    const item = await this.request<NominatimItem & { error?: string }>(
      `/reverse?${params}`,
    );
    return item.error ? null : this.toSuggestion(item);
  }

  private toSuggestion(item: NominatimItem): PlaceSuggestion {
    const address = item.address ?? {};
    const city =
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      null;
    const region = address.state ?? null;
    return {
      label: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      city,
      region,
    };
  }

  /** Waits for this request's turn; requests are at least one second apart (usage policy of the public service). */
  private async throttle(): Promise<void> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => (release = resolve));
    await previous;
    const wait =
      this.lastRequestAt + NominatimProvider.MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.lastRequestAt = Date.now();
    release();
  }

  private async request<T>(path: string): Promise<T> {
    await this.throttle();
    const response = await fetch(`${this.config.geocoder.baseUrl}${path}`, {
      headers: {
        'User-Agent': this.config.geocoder.userAgent,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(NominatimProvider.TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`Geocoder responded with HTTP ${response.status}`);
    return (await response.json()) as T;
  }
}
