import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  beforeEach(() => {
    jest.useFakeTimers();
    service = new RateLimiterService();
  });
  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });
  it('isolates clients and resets an expired window at the boundary', () => {
    expect(service.hit('a', 1, 1000, 0)).toBe(0);
    expect(service.hit('a', 1, 1000, 999)).toBe(1);
    expect(service.hit('b', 1, 1000, 999)).toBe(0);
    expect(service.hit('a', 1, 1000, 1000)).toBe(0);
    service.reset();
    expect(service.hit('a', 1, 1000, 1001)).toBe(0);
  });
  it('sweeps expired clients and releases the cleanup timer on shutdown', () => {
    jest.setSystemTime(0);
    service.hit('old', 1);
    service.hit('new', 1, 120000);
    jest.advanceTimersByTime(60000);
    expect(service.hit('old', 1)).toBe(0);
    expect(service.hit('new', 1)).toBe(60);
    service.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });
});
