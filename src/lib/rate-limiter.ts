import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a new ratelimiter with different options
let ratelimit: Ratelimit | null = null;
let redis: Redis | null = null;

// Get rate limit configuration from environment variables
const RATE_LIMIT_MAX = parseInt(import.meta.env.RATE_LIMIT_MAX || "10");
const RATE_LIMIT_WINDOW = parseInt(import.meta.env.RATE_LIMIT_WINDOW || "10");
const RATE_LIMIT_BASE_WAIT = parseInt(
  import.meta.env.RATE_LIMIT_BASE_WAIT || "60"
); // 1 minute in seconds
const RATE_LIMIT_MAX_WAIT = parseInt(
  import.meta.env.RATE_LIMIT_MAX_WAIT || "3600"
); // 1 hour in seconds
const RATE_LIMIT_VIOLATION_EXPIRY = parseInt(
  import.meta.env.RATE_LIMIT_VIOLATION_EXPIRY || "86400"
); // 24 hours in seconds

// Initialize rate limiter
try {
  // Ensure Redis URL starts with https://
  const redisUrl = import.meta.env.UPSTASH_REDIS_REST_URL;
  const redisToken = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    throw new Error("Missing Redis configuration");
  }

  const formattedUrl = redisUrl.startsWith("https://")
    ? redisUrl
    : `https://${redisUrl}`;

  redis = new Redis({
    url: formattedUrl,
    token: redisToken,
  });

  // Initialize rate limiter with sliding window
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, `${RATE_LIMIT_WINDOW} s`),
    analytics: true,
    prefix: "@upstash/ratelimit",
  });
} catch {
  throw new Error("Rate limiter initialization failed");
}

// Helper function to get violation count
async function getViolations(identifier: string): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    const violations = await redis.get(`violations:${identifier}`);
    return violations ? parseInt(violations as string) : 0;
  } catch {
    return 0;
  }
}

// Helper function to increment violation count
async function incrementViolations(identifier: string): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    const violations = await redis.incr(`violations:${identifier}`);
    await redis.expire(`violations:${identifier}`, RATE_LIMIT_VIOLATION_EXPIRY);
    return violations;
  } catch {
    return 0;
  }
}

// Helper function to calculate backoff time
function calculateBackoffTime(violations: number): number {
  return Math.min(
    RATE_LIMIT_BASE_WAIT * Math.pow(2, violations - 1),
    RATE_LIMIT_MAX_WAIT
  );
}

export async function isRateLimited(identifier: string) {
  if (!ratelimit) {
    throw new Error("Rate limiter not initialized");
  }

  try {
    const { success, limit, reset, remaining } =
      await ratelimit.limit(identifier);

    // Rate limit if either:
    // 1. The request was not successful (success = false)
    // 2. There are no remaining requests (remaining = 0)
    const isLimited = !success || remaining === 0;

    // If limited, increment violations
    let violations = 0;
    if (isLimited) {
      violations = await incrementViolations(identifier);
    } else {
      violations = await getViolations(identifier);
    }

    // Calculate backoff time if limited
    const backoffTime = isLimited
      ? calculateBackoffTime(violations)
      : Math.ceil((reset - Date.now()) / 1000);

    return {
      limited: isLimited,
      remainingTime: backoffTime,
      remaining,
      limit,
      violations,
    };
  } catch {
    // On error, block the request
    return {
      limited: true,
      remainingTime: RATE_LIMIT_BASE_WAIT,
      remaining: 0,
      limit: RATE_LIMIT_MAX,
      violations: 0,
    };
  }
}
