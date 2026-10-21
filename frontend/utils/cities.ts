import { regionsWithCities } from '~/data/Regions';

export interface CityOption {
  city: string;
  region: string;
}

const ALL_CITIES: CityOption[] = Object.entries(regionsWithCities as Record<string, string[]>).flatMap(
  ([region, cities]) => cities.map((city) => ({ city, region })),
);

export function searchCities(query: string, limit = 8): CityOption[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  const starts: CityOption[] = [];
  const contains: CityOption[] = [];
  for (const option of ALL_CITIES) {
    const name = option.city.toLowerCase();
    if (name.startsWith(needle)) starts.push(option);
    else if (name.includes(needle)) contains.push(option);
  }
  return [...starts, ...contains].slice(0, limit);
}

export function findCity(name: string): CityOption | undefined {
  const needle = name.trim().toLowerCase();
  return ALL_CITIES.find((option) => option.city.toLowerCase() === needle);
}
