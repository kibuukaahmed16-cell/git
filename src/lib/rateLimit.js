// In-memory rate limiter - fine for a single server instance, which is
// exactly what this app runs as on Railway or a VPS. If T3RRI HUB ever
// runs multiple instances behind a load balancer, swap this for a
// shared store (Redis, etc.) so limits are enforced globally instead
// of per-instance.

const buckets = new Map();

// Sweep old entries occasionally so this doesn't grow forever.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > bucket.windowMs) buckets.delete(key);
  }
}

/**
 * Fixed-window rate limiter, keyed however the caller likes (usually
 * `${route}:${userId or ip}`).
 * @returns {{ ok: boolean, remaining: number, retryAfterSeconds: number }}
 */
export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  sweep();
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    bucket = { count: 0, windowStart: now, windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  const ok = bucket.count <= limit;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000));
  return { ok, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds };
}

/** Best-effort client IP from standard proxy headers (Railway/most VPS reverse proxies set these). */
export function clientIp(request) {
  const h = request.headers;
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
