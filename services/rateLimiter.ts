/**
 * ADVANCED FEATURE: RATE LIMITING
 * 
 * In a real Node.js/Redis environment, this would use a Lua script 
 * in Redis to atomically decrement a token bucket.
 * 
 * Here, we simulate a Token Bucket algorithm in memory.
 */

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // 100 requests per minute

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

// In-memory store for rate limits (IP address -> Bucket)
const rateLimitStore = new Map<string, TokenBucket>();

export const checkRateLimit = (ipAddress: string): boolean => {
  const now = Date.now();
  let bucket = rateLimitStore.get(ipAddress);

  if (!bucket) {
    bucket = { tokens: MAX_REQUESTS, lastRefill: now };
    rateLimitStore.set(ipAddress, bucket);
  } else {
    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    if (timePassed > WINDOW_SIZE_MS) {
      bucket.tokens = MAX_REQUESTS;
      bucket.lastRefill = now;
    }
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true; // Allowed
  }

  return false; // Blocked (429 Too Many Requests)
};
