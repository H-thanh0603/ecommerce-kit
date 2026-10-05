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

/** Redis lỗi → fail-open nhưng phải thấy được: log + Sentry (nếu đã cấu hình). */
async function reportRedisFailure(e: unknown) {
  console.error(`[ratelimit] redis lỗi, mở tạm: ${e instanceof Error ? e.message : e}`);
  try {
    if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(e, { tags: { component: "rate-limit" } });
    }
  } catch {
    // Sentry chưa có/chưa init — đã có console.error ở trên.
  }
}

/**
 * Giới hạn tần suất — memory mặc định, Redis (Upstash REST) khi có env.
 * Async để đổi backend không vỡ call-site. Lỗi Redis → mở (fail-open) + report.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  if (!redisConfigured()) return memoryLimit(key, limit, windowMs);
  try {
    return await redisLimit(key, limit, windowMs);
  } catch (e) {
    await reportRedisFailure(e);
    return memoryLimit(key, limit, windowMs);
  }
}

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-f:]{2,45}$/i;

function plausibleIp(v: string): boolean {
  if (IPV4_RE.test(v)) return v.split(".").every((p) => Number(p) <= 255);
  return IPV6_RE.test(v);
}

let warnedUnsetTrustedProxy = false;

export function clientKey(req: Request, kind: string) {
  // TRUSTED_PROXY=true → tin x-real-ip/XFF (nginx/Vercel đặt).
  // TRUSTED_PROXY=false → đứng thẳng (không proxy): header client tự gửi được,
  //   lách per-IP limit được → gộp 1 bucket chung "local" (per-email limit vẫn giữ).
  // Không set → hành vi cũ (tin header) vì deploy chuẩn của kit luôn có proxy;
  //   production thiếu biến này là cấu hình sai → warn 1 lần.
  const trusted = process.env.TRUSTED_PROXY;
  if (trusted === undefined && !warnedUnsetTrustedProxy) {
    warnedUnsetTrustedProxy = true;
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[ratelimit] TRUSTED_PROXY chưa set — đang tin x-real-ip/XFF do client gửi được. " +
          "Deploy sau proxy (Vercel/nginx): set TRUSTED_PROXY=true. Chạy trực tiếp: set TRUSTED_PROXY=false.",
      );
    }
  }
  const fromHeader =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  // Header rác/garbage (không phải IP) → không dùng làm key.
  const safeHeader = fromHeader && plausibleIp(fromHeader) ? fromHeader : "";
  const ip = trusted === "false" ? "local" : safeHeader || "local";
  return `${kind}:${ip}`;
}
