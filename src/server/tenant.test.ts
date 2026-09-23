import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseHost, resolveTenant, setTenantLookup, slugSchema } from "./tenant";
import { runWithTenant, getTenantSchema } from "./tenant-context";

describe("slugSchema", () => {
  it("chấp nhận slug hợp lệ, chặn public/platform/special char", () => {
    expect(slugSchema.safeParse("shopa").success).toBe(true);
    expect(slugSchema.safeParse("shop_1").success).toBe(true);
    expect(slugSchema.safeParse("public").success).toBe(false);
    expect(slugSchema.safeParse("platform").success).toBe(false);
    expect(slugSchema.safeParse("ShopA").success).toBe(false);
    expect(slugSchema.safeParse("1shop").success).toBe(false);
    expect(slugSchema.safeParse("shop-a").success).toBe(false);
    expect(slugSchema.safeParse("").success).toBe(false);
  });
});

describe("parseHost", () => {
  it("bỏ port, lowercase", () => {
    expect(parseHost("ShopA.vn:3000")).toBe("shopa.vn");
    expect(parseHost("localhost:3000")).toBe("localhost");
    expect(parseHost("shopa.localhost")).toBe("shopa.localhost");
  });
});

describe("resolveTenant", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("host không tồn tại → null (không rơi vào public)", async () => {
    setTenantLookup(async () => null);
    expect(await resolveTenant("khong-ton-tai.vn")).toBeNull();
  });

  it("host khớp → trả slug, cache 60s (lookup gọi 1 lần)", async () => {
    const lookup = vi.fn(async (host: string) =>
      host === "shopa.vn" ? { slug: "shopa", name: "Shop A" } : null,
    );
    setTenantLookup(lookup);
    expect(await resolveTenant("shopa.vn")).toEqual({ slug: "shopa", name: "Shop A" });
    expect(await resolveTenant("shopa.vn")).toEqual({ slug: "shopa", name: "Shop A" });
    expect(lookup).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(61_000);
    await resolveTenant("shopa.vn");
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("localhost → DEFAULT_TENANT (fallback public), không gọi lookup", async () => {
    const prev = process.env.DEFAULT_TENANT;
    process.env.DEFAULT_TENANT = "public";
    const lookup = vi.fn(async () => null);
    setTenantLookup(lookup);
    expect(await resolveTenant("localhost")).toEqual({ slug: "public", name: "Default" });
    expect(lookup).not.toHaveBeenCalled();
    process.env.DEFAULT_TENANT = prev;
  });
});

describe("resolveBaseUrl", () => {
  // NEXT_BUILD/Next types khai báo NODE_ENV read-only — ghi qua cast rồi restore.
  const mutableEnv = process.env as { NODE_ENV?: string; APP_URL?: string };

  it("host → base theo env; null → APP_URL fallback", async () => {
    const { resolveBaseUrl } = await import("./tenant");
    const prevNode = process.env.NODE_ENV;
    const prevApp = process.env.APP_URL;
    try {
      process.env.APP_URL = "http://fallback.vn";
      // test dev (NODE_ENV trong vitest = test)
      expect(resolveBaseUrl("shopa.vn")).toBe("http://shopa.vn");
      expect(resolveBaseUrl("shopa.vn:3000")).toBe("http://shopa.vn");
      expect(resolveBaseUrl(null)).toBe("http://fallback.vn");
    } finally {
      mutableEnv.NODE_ENV = prevNode;
      process.env.APP_URL = prevApp;
    }
  });

  it("NODE_ENV=production → https (set env rồi restore)", async () => {
    const { resolveBaseUrl } = await import("./tenant");
    const prevNode = process.env.NODE_ENV;
    try {
      mutableEnv.NODE_ENV = "production";
      expect(resolveBaseUrl("shopa.vn")).toBe("https://shopa.vn");
      expect(resolveBaseUrl(null)).toBe(process.env.APP_URL || "http://localhost:3000");
    } finally {
      mutableEnv.NODE_ENV = prevNode;
    }
  });
});

describe("tenant-context", () => {
  it("default public; runWithTenant set trong scope async rồi thoát", async () => {
    expect(getTenantSchema()).toBe("public");
    const inside = await runWithTenant("shopa", async () => getTenantSchema());
    expect(inside).toBe("shopa");
    expect(getTenantSchema()).toBe("public");
  });
});
