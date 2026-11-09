import { loadAppConfig } from '../../config/app.config';
import { NominatimProvider } from './nominatim.provider';

describe('NominatimProvider transport', () => {
  let fetchMock: jest.SpyInstance;
  let timeoutMock: jest.SpyInstance;
  let provider: NominatimProvider;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10000);
    fetchMock = jest.spyOn(globalThis, 'fetch');
    timeoutMock = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(new AbortController().signal);
    provider = new NominatimProvider(
      loadAppConfig({ GEOCODER_BASE_URL: 'https://geocoder.test' }),
    );
  });
  afterEach(() => jest.useRealTimers());
  it('encodes search parameters, passes a timeout and normalizes coordinates', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: '50.45',
          lon: '30.52',
          display_name: 'Kyiv',
          address: { city: 'Kyiv', state: 'Kyiv Oblast' },
        },
      ],
    });
    expect(await provider.search('Kyiv & centre', { limit: 6 })).toEqual([
      {
        latitude: 50.45,
        longitude: 30.52,
        label: 'Kyiv',
        city: 'Kyiv',
        region: 'Kyiv Oblast',
      },
    ]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get('q')).toBe('Kyiv & centre');
    expect(new URL(url).searchParams.get('countrycodes')).toBe('ua');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(timeoutMock).toHaveBeenCalledWith(5000);
  });
  it('serializes requests at least one second apart and supports missing addresses', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ lat: '1', lon: '2', display_name: 'Place' }),
    });
    const first = provider.reverse(1, 2);
    const second = provider.reverse(3, 4);
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(await second).toMatchObject({ city: null, region: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each(['town', 'village', 'municipality'])(
    'uses the %s fallback',
    async (field) => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          lat: '1',
          lon: '2',
          display_name: 'Place',
          address: { [field]: 'Town' },
        }),
      });
      expect(await provider.reverse(1, 2)).toMatchObject({ city: 'Town' });
    },
  );
  it('returns null for missing reverse results and propagates transport errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'not found' }),
    });
    expect(await provider.reverse(1, 2)).toBeNull();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    const error = expect(
      provider.search('offline', { limit: 1 }),
    ).rejects.toThrow('503');
    await jest.advanceTimersByTimeAsync(1000);
    await error;
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    const timeout = expect(provider.reverse(3, 4)).rejects.toThrow('timeout');
    await jest.advanceTimersByTimeAsync(1000);
    await timeout;
  });
});
