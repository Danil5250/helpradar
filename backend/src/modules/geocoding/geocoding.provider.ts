export interface PlaceSuggestion {
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
}

export interface SearchOptions {
  limit: number;
}

/**
 * Adapter for the external map/geocoding service (SRS 3.5.6 "Map provider"): another provider
 * (e.g. Google Maps) can be plugged in by implementing this class, without changing other modules.
 */
export abstract class GeocodingProvider {
  abstract search(
    query: string,
    options: SearchOptions,
  ): Promise<PlaceSuggestion[]>;
  abstract reverse(
    latitude: number,
    longitude: number,
  ): Promise<PlaceSuggestion | null>;
}
