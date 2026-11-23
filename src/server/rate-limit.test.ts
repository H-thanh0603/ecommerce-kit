import { describe, expect, it, vi } from "vitest";
import { memoryBucketCount, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("cho qua trong hạn mức, chặn khi vượt", async () => {
    const key = `t-${Date.now()}-${Math.random()}`;
    expect((await rateLimit(key, 2, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).ok).toBe(false);
  });

  it("key khác nhau không ảnh hưởng nhau", async () => {
    const a = `a-${Date.now()}-${Math.random()}`;
    const b = `b-${Date.now()}-${Math.random()}`;
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(true);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
  });

  it("dọn bucket hết hạn theo định kỳ để không leak RAM", async () => {
    const prefix = `prune-${Date.now()}`;
    for (let i = 0; i < 300; i++) {
      await rateLimit(`${prefix}-${i}`, 1, 1);
    }
    await new Promise((r) => setTimeout(r, 10));
    // Đủ 256 lần gọi để kích hoạt sweep — bucket hết hạn phải được xóa.
    for (let i = 0; i < 260; i++) {
      await rateLimit(`${prefix}-sweep`, 1000, 60_000);
    }
    expect(memoryBucketCount()).toBeLessThan(100);
  });

  it("redis pipeline gửi key nguyên khối (không split khi key có khoảng trắng)", async () => {
    const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevTok = process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    const bodies: unknown[] = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify([{ result: 1 }, { result: -1 }]), { status: 200 });
    });
    try {
      const res = await rateLimit("login:bad key with space", 5, 60_000);
      expect(res.ok).toBe(true);
      expect(bodies[0]).toEqual([
        ["INCR", "rl:login:bad key with space"],
        ["TTL", "rl:login:bad key with space"],
      ]);
      expect(bodies[1]).toEqual([["EXPIRE", "rl:login:bad key with space", "60"]]);
    } finally {
      fetchSpy.mockRestore();
      if (prevUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = prevUrl;
      if (prevTok === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = prevTok;
    }
  });
});
