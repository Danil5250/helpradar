import { describe, expect, it } from 'vitest';
import { cityCoordinates, formatDistance, hoursLeft, timeAgo } from '~/utils/format';
import { findCity, searchCities } from '~/utils/cities';

describe('formatting', () => {
  const now = new Date('2026-10-23T12:00:00Z').getTime();

  it('shows the publication time relative to now in both languages', () => {
    expect(timeAgo('2026-10-23T11:59:30Z', 'en', now)).toBe('30 seconds ago');
    expect(timeAgo('2026-10-23T10:00:00Z', 'en', now)).toBe('2 hours ago');
    expect(timeAgo('2026-10-21T12:00:00Z', 'en', now)).toBe('2 days ago');
    expect(timeAgo('2026-10-23T10:00:00Z', 'uk', now)).toContain('год');
  });

  it('formats distances', () => {
    expect(formatDistance(0.4)).toBe('400 m');
    expect(formatDistance(3.26)).toBe('3.3 km');
    expect(formatDistance(120.4)).toBe('120 km');
  });

  it('counts the hours until the expiry date', () => {
    expect(hoursLeft('2026-10-24T11:00:00Z', now)).toBe(23);
  });

  it('finds the position of the profile city', () => {
    expect(cityCoordinates('Вінниця')).toEqual({ lat: 49.2328, lng: 28.4835 });
    expect(cityCoordinates('  вінниця ')).toEqual({ lat: 49.2328, lng: 28.4835 });
    expect(cityCoordinates('Nowhere')).toBeNull();
    expect(cityCoordinates(null)).toBeNull();
  });
});

describe('city autocomplete (SRS 3.2.1.2)', () => {
  it('suggests cities that start with the text first, with their region', () => {
    const [first] = searchCities('Вінн');
    expect(first).toEqual({ city: 'Вінниця', region: 'Вінницька область' });
  });

  it('is case-insensitive, limited and empty for an empty query', () => {
    expect(searchCities('львів').some((option) => option.city === 'Львів')).toBe(true);
    expect(searchCities('а', 5).length).toBeLessThanOrEqual(5);
    expect(searchCities('   ')).toEqual([]);
    expect(searchCities('zzzzzz')).toEqual([]);
  });

  it('only accepts a known city as the selected value', () => {
    expect(findCity('Львів')?.region).toBe('Львівська область');
    expect(findCity('Atlantis')).toBeUndefined();
  });
});
