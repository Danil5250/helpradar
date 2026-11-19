import { describe, expect, it, vi } from 'vitest';
import { expandedMarkerPoints, groupMapMarkers, loadMapPages, resolveMapPosition } from '~/utils/map';
import type { MapAnnouncements, MapMarker } from '~/types/announcement';

const marker = (id: number): MapMarker => ({
  id,
  type: 'HelpRequest',
  title: `Request ${id}`,
  description: 'Need help nearby.',
  category: { id: 1, name: 'Food' },
  isUrgent: false,
  datePosted: '2026-11-15',
  distanceKm: 1,
  location: { latitude: 50, longitude: 30 },
  approxLocation: { latitude: 51, longitude: 31 },
});

describe('interactive map acceptance criteria', () => {
  it('loads all markers beyond the first 500 and deduplicates concurrent page overlap', async () => {
    const first = Array.from({ length: 500 }, (_, index) => marker(index + 1));
    const page = (items: MapMarker[], hasMore: boolean): MapAnnouncements => ({
      items,
      hasMore,
      total: 501,
      page: hasMore ? 1 : 2,
      pageSize: 500,
      radiusKm: 10,
    });
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(first, true))
      .mockResolvedValueOnce(page([marker(500), marker(501)], false));
    const query = { lat: 50, lng: 30, radius: 10, north: 51, south: 49, east: 31, west: 29 };
    const result = await loadMapPages(fetchPage, query);
    expect(result.items).toHaveLength(501);
    expect(result.items.at(-1)?.id).toBe(501);
    expect(fetchPage).toHaveBeenLastCalledWith({ ...query, page: 2 }, undefined);
  });

  it('discards an obsolete viewport request before loading the next page', async () => {
    const controller = new AbortController();
    const fetchPage = vi.fn(async () => {
      controller.abort();
      return { items: [marker(1)], total: 501, hasMore: true, page: 1, pageSize: 500, radiusKm: 10 };
    });
    await expect(loadMapPages(fetchPage, { lat: 50, lng: 30, radius: 10 }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('clusters the actual marker locations and splits nearby markers as the scale increases', () => {
    const markers = [marker(1), { ...marker(2), location: { latitude: 50, longitude: 30.1 } }];
    expect(groupMapMarkers(markers, ({ longitude }) => ({ x: (longitude - 30) * 10, y: 0 }))).toHaveLength(1);
    expect(groupMapMarkers(markers, ({ longitude }) => ({ x: (longitude - 30) * 1000, y: 0 }))).toHaveLength(2);
  });

  it.each([2, 10, 100])('makes every coincident marker selectable at maximum zoom (%i markers)', (count) => {
    const points = expandedMarkerPoints({ x: 200, y: 200 }, count);
    expect(new Set(points.map(({ x, y }) => `${x}:${y}`)).size).toBe(count);
    for (let i = 0; i < points.length; i += 1) {
      const next = points[(i + 1) % count];
      expect(Math.hypot(points[i].x - next.x, points[i].y - next.y)).toBeGreaterThan(20);
    }
  });

  it('prefers granted device location even when a profile city is already known', async () => {
    const request = vi.fn().mockResolvedValue({ lat: 49.84, lng: 24.03 });
    expect(await resolveMapPosition(request, { lat: 50.45, lng: 30.52 })).toEqual({ position: { lat: 49.84, lng: 24.03 }, source: 'device', denied: false });
    expect(request).toHaveBeenCalledOnce();
  });

  it('keeps a usable default location when access is denied', async () => {
    const fallback = { lat: 50.45, lng: 30.52 };
    expect(await resolveMapPosition(() => Promise.reject({ code: 1 }), fallback)).toEqual({ position: fallback, source: 'fallback', denied: true });
  });
});
