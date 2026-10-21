import { citiesWithCoordinates } from '~/data/citiesWithCoordinates';

export function timeAgo(iso: string, locale: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return formatter.format(seconds, 'second');
  if (abs < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return formatter.format(Math.round(seconds / 86400), 'day');
  return formatter.format(Math.round(seconds / (86400 * 30)), 'month');
}

export function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === 'uk' ? 'uk-UA' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function hoursLeft(iso: string, now = Date.now()): number {
  return (new Date(iso).getTime() - now) / 3_600_000;
}

export function cityCoordinates(name: string | null | undefined): { lat: number; lng: number } | null {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  return citiesWithCoordinates.find((city) => city.name.toLowerCase() === needle)?.position ?? null;
}
