type Bucket = { n: number; reset: number };

const buckets = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (cur.n >= limit) return { ok: false, remaining: 0 };
  cur.n += 1;
  return { ok: true, remaining: limit - cur.n };
}

function redisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisLimit(key: string, limit: number, windowMs: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const headers = { Authorization: `Bearer ${token}` };
  const get = async (parts: string[]) =>
    fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(parts.map((c) => c.split(" "))),
    }).then((r) => r.json() as Promise<Array<{ result: unknown }>>);
  const secs = Math.max(1, Math.ceil(windowMs / 1000));
  const k = `rl:${key}`;
  const [incr, ttl] = await get([`INCR ${k}`, `TTL ${k}`]);
  const n = Number(incr.result);
  if (Number((ttl as { result: unknown }).result) === -1) {
    await get([`EXPIRE ${k} ${secs}`]);
  }
  return { ok: n <= limit, remaining: Math.max(0, limit - n) };
}

/**
 * Giới hạn tần suất — memory mặc định, Redis (Upstash REST) khi có env.
 * Async để đổi backend không vỡ call-site. Lỗi Redis → mở (fail-open) + log.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  if (!redisConfigured()) return memoryLimit(key, limit, windowMs);
  try {
    return await redisLimit(key, limit, windowMs);
  } catch (e) {
    console.error(`[ratelimit] redis lỗi, mở tạm: ${e instanceof Error ? e.message : e}`);
    return memoryLimit(key, limit, windowMs);
  }
}

export function clientKey(req: Request, kind: string) {
  // Ưu tiên header do proxy tin cậy đặt (x-real-ip) — XFF client tự gửi được khi đứng thẳng.
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  return `${kind}:${ip}`;
}
