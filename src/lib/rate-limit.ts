type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  windowMs: number;
  max: number;
};

declare global {
  var familyFlowRateLimitStore: Map<string, RateLimitBucket> | undefined;
}

const rateLimitStore = global.familyFlowRateLimitStore ?? new Map<string, RateLimitBucket>();

if (!global.familyFlowRateLimitStore) {
  global.familyFlowRateLimitStore = rateLimitStore;
}

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getRequestClientId(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "anonymous";
}

export function getHeaderClientId(headers?: Record<string, string | string[] | undefined>) {
  if (!headers) {
    return "anonymous";
  }

  const forwardedFor = headers["x-forwarded-for"];
  const realIp = headers["x-real-ip"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;

  return forwardedValue?.split(",")[0]?.trim() || realIpValue?.trim() || "anonymous";
}

export function consumeRateLimit({ key, windowMs, max }: RateLimitOptions) {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const bucket = rateLimitStore.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(max - 1, 0),
    };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  bucket.count += 1;
  rateLimitStore.set(key, bucket);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(max - bucket.count, 0),
  };
}
