import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Small in-memory fixed-window rate limiter (SRS 3.5.4: 100 requests per minute per account,
 * 10 login attempts per minute per IP address). It is process-local; use a shared store such
 * as Redis if the API is scaled horizontally.
 */
@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly buckets = new Map<string, Bucket>();
  private readonly cleanup = setInterval(() => this.sweep(), 60_000);

  constructor() {
    this.cleanup.unref();
  }

  /** Registers a hit. Returns 0 when allowed, otherwise the number of seconds until the window resets. */
  hit(key: string, limit: number, windowMs = 60_000, now = Date.now()): number {
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > limit)
      return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return 0;
  }

  reset(): void {
    this.buckets.clear();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanup);
  }

  private sweep(now = Date.now()): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
