import { Logger } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  const place = {
    label: 'Kyiv',
    latitude: 50.45,
    longitude: 30.52,
    city: 'Kyiv',
    region: null,
  };
  let provider: { search: jest.Mock; reverse: jest.Mock };
  let service: GeocodingService;
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.useFakeTimers();
    jest.setSystemTime(10000);
    provider = {
      search: jest.fn().mockResolvedValue([place]),
      reverse: jest.fn().mockResolvedValue(place),
    };
    service = new GeocodingService(provider);
  });
  afterEach(() => jest.useRealTimers());
  it('normalizes requests, caches results and reloads at TTL expiry', async () => {
    expect(await service.searchAddress(' Kyiv ')).toEqual([place]);
    expect(await service.geocodeAddress('kyiv')).toEqual({
      latitude: 50.45,
      longitude: 30.52,
    });
    expect(provider.search).toHaveBeenCalledTimes(1);
    expect(provider.search).toHaveBeenCalledWith('Kyiv', { limit: 6 });
    jest.advanceTimersByTime(600000);
    await service.searchAddress('Kyiv');
    expect(provider.search).toHaveBeenCalledTimes(2);
  });
  it('evicts the oldest entry and represents an empty search as no point', async () => {
    for (let i = 0; i < 501; i++) await service.searchAddress(`address ${i}`);
    await service.searchAddress('address 0');
    expect(provider.search).toHaveBeenCalledTimes(502);
    provider.search.mockResolvedValueOnce([]);
    expect(await service.geocodeAddress('missing')).toBeNull();
  });
  it('does not cache provider failures and treats reverse failure as unavailable', async () => {
    provider.search.mockRejectedValueOnce(new Error('offline'));
    await expect(service.searchAddress('Kyiv')).rejects.toMatchObject({
      code: 'GEOCODER_UNAVAILABLE',
    });
    expect(await service.searchAddress('Kyiv')).toEqual([place]);
    provider.reverse.mockRejectedValueOnce(new Error('offline'));
    expect(await service.reverse(1, 2)).toBeNull();
    expect(await service.reverse(1, 2)).toEqual(place);
    expect(await service.reverse(1.000001, 2.000001)).toEqual(place);
    expect(provider.reverse).toHaveBeenCalledTimes(2);
  });
});
