import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

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
});
