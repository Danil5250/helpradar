import type { MapAnnouncements, MapBounds, MapMarker, MapQuery } from '~/types/announcement';

/** Load the entire visible area rather than silently truncating it to one API page. */
export async function loadMapPages(
  fetchPage: (query: MapQuery, signal?: AbortSignal) => Promise<MapAnnouncements>,
  query: MapQuery,
  signal?: AbortSignal
): Promise<MapAnnouncements> {
  const markers = new Map<number, MapMarker>();
  let page = 1;
  let result: MapAnnouncements;
  do {
    signal?.throwIfAborted();
    result = await fetchPage({ ...query, page }, signal);
    signal?.throwIfAborted();
    for (const marker of result.items) markers.set(marker.id, marker);
    page += 1;
  } while (result.hasMore);
  return { ...result, items: [...markers.values()], hasMore: false };
}

export function normalizeMapBounds(bounds: MapBounds): MapBounds {
  const wrap = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;
  const wholeWorld = bounds.east - bounds.west >= 360;
  return {
    north: Math.min(90, bounds.north),
    south: Math.max(-90, bounds.south),
    east: wholeWorld ? 180 : wrap(bounds.east),
    west: wholeWorld ? -180 : wrap(bounds.west),
  };
}

export function groupMapMarkers(markers: MapMarker[], project: (point: MapMarker['location']) => { x: number; y: number }, cellSize = 60): MapMarker[][] {
  const cells = new Map<string, MapMarker[]>();
  for (const marker of markers) {
    const point = project(marker.location);
    const key = `${Math.floor(point.x / cellSize)}:${Math.floor(point.y / cellSize)}`;
    const group = cells.get(key) ?? [];
    group.push(marker);
    cells.set(key, group);
  }
  return [...cells.values()];
}

export function expandedMarkerPoints(center: { x: number; y: number }, count: number): { x: number; y: number }[] {
  const radius = Math.max(35, (count * 24) / (2 * Math.PI));
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * 2 * Math.PI) / count;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  });
}

type MapPosition = { lat: number; lng: number };

export function deviceMapPosition(geolocation: Geolocation | undefined): Promise<MapPosition> {
  return new Promise((resolve, reject) => {
    if (!geolocation) {
      reject(new Error('Geolocation unavailable'));
      return;
    }
    geolocation.getCurrentPosition(({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }), reject, { timeout: 8000, maximumAge: 300_000 });
  });
}

/** The profile city is a fallback, never a reason to skip device location. */
export async function resolveMapPosition(
  request: () => Promise<MapPosition>,
  fallback: MapPosition
): Promise<{ position: MapPosition; source: 'device' | 'fallback'; denied: boolean }> {
  try {
    return { position: await request(), source: 'device', denied: false };
  } catch (error) {
    return { position: fallback, source: 'fallback', denied: (error as { code?: number }).code === 1 };
  }
}
