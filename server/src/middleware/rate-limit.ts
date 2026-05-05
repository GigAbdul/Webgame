import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error';

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();
const MAX_BUCKETS_BEFORE_CLEANUP = 10_000;

function getClientKey(request: Request, keyPrefix: string) {
  return `${keyPrefix}:${request.ip || request.socket.remoteAddress || 'unknown'}`;
}

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS_BEFORE_CLEANUP) {
    return;
  }

  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function createRateLimit(options: RateLimitOptions) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (request.method === 'OPTIONS') {
      return next();
    }

    const now = Date.now();
    const key = getClientKey(request, options.keyPrefix);
    const currentEntry = buckets.get(key);
    const entry =
      currentEntry && currentEntry.resetAt > now
        ? currentEntry
        : {
            count: 0,
            resetAt: now + options.windowMs,
          };

    cleanupExpiredBuckets(now);

    entry.count += 1;
    buckets.set(key, entry);

    const remaining = Math.max(0, options.max - entry.count);
    response.setHeader('RateLimit-Limit', String(options.max));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > options.max) {
      response.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new ApiError(429, options.message ?? 'Too many requests. Try again later.'));
    }

    return next();
  };
}
