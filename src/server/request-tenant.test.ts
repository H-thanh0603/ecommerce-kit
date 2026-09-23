import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureSchema, dropSchema } from "./test-schema";
import { enterTenant, resolveRequestTenant, withTenantFromRequest } from "./request-tenant";
import { setTenantLookup, wireTenantLookup } from "./tenant";
import { getTenantSchema, runWithTenant } from "./tenant-context";
import { getEffectiveSiteConfig, saveSiteSettings } from "./settings";

// Headers giả cho resolveRequestTenant (page entry đọc Host của request).
let testHost: string | null = null;
vi.mock("next/headers", () => ({
  headers: async () => new Headers(testHost ? { host: testHost } : {}),
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

// Deviation giống tenant-settings.test (T6): next/cache ngoài runtime Next ném
// invariant "static generation store missing" — mock theo keyParts + tags.
vi.mock("next/cache", () => {
  const entries = new Map<string, unknown>();
  const tagKeys = new Map<string, Set<string>>();
  return {
    unstable_cache: (fn: () => Promise<unknown>, keyParts: string[] = [], opts?: { tags?: string[] }) => {
      const key = JSON.stringify(keyParts);
      for (const t of opts?.tags ?? []) {
        if (!tagKeys.has(t)) tagKeys.set(t, new Set());
        tagKeys.get(t)!.add(key);
      }
      return async () => {
        if (entries.has(key)) return entries.get(key);
        const v = await fn();
        entries.set(key, v);
        return v;
      };
    },
    revalidateTag: (tag: string) => {
      for (const k of tagKeys.get(tag) ?? []) entries.delete(k);
    },
  };
});

const S = `rt${Date.now()}`;
const HOST = `rt${Date.now()}.vn`;

describe("request-tenant — phủ ALS cho page entry (T7 fix)", () => {
  beforeAll(async () => {
    await ensureSchema(S);
  }, 180_000);

  afterAll(async () => {
    testHost = null;
    await dropSchema(S);
    setTenantLookup(async () => null);
  });

  it("reader trong withTenantFromRequest chạy đúng schema tenant; ngoài scope là default", async () => {
    // wire trước fake — helper gọi wireTenantLookup idempotent, không ghi đè.
    wireTenantLookup();
    setTenantLookup(async (h) => (h === HOST ? { slug: S, name: "RT" } : null));

    await withTenantFromRequest(HOST, async () => {
      await saveSiteSettings({ brand: { name: "Tenant RT" } });
    });
    const inside = await withTenantFromRequest(HOST, () => getEffectiveSiteConfig());
    expect(inside.brand.name).toBe("Tenant RT");

    // Ngoài scope: reader quay lại default — không thấy data tenant.
    expect(getTenantSchema()).toBe("public");
    const outside = await getEffectiveSiteConfig();
    expect(outside.brand.name).not.toBe("Tenant RT");
  });

  it("enterTenant: scope chuyển trong frame gọi (mô phỏng page), frame ngoài không leak", async () => {
    const pageFrame = async () => {
      // Đúng pattern page entry: await resolve TRƯỚC, enterWith chạy trong
      // continuation frame của page → phủ phần còn lại của page, không leak caller.
      // (EnterWith lúc sync-start TRƯỚC await đầu sẽ chuyển context của caller —
      // cấm pattern đó, xem enterTenantScope.)
      await new Promise((r) => setTimeout(r, 1)); // ≈ await resolveRequestTenant()
      enterTenant({ slug: S, name: "RT" });
      await new Promise((r) => setTimeout(r, 1)); // fetch tiếp theo trong page
      return getEffectiveSiteConfig();
    };
    expect((await pageFrame()).brand.name).toBe("Tenant RT");
    expect(getTenantSchema()).toBe("public");
  });

  it("resolveRequestTenant đọc Host: forged → null; tenant khớp → tenant; local → default", async () => {
    wireTenantLookup();
    setTenantLookup(async (h) => (h === HOST ? { slug: S, name: "RT" } : null));
    testHost = "evil.vn";
    expect(await resolveRequestTenant()).toBeNull();
    testHost = HOST;
    expect(await resolveRequestTenant()).toEqual({ slug: S, name: "RT" });
    testHost = "shopa.localhost:3000";
    expect((await resolveRequestTenant())?.slug).toBe(process.env.DEFAULT_TENANT || "public");
    testHost = null;
    expect(await resolveRequestTenant()).toBeNull();
    setTenantLookup(async () => null);
  });

  it("ALS lồng — inner wins, thoát inner về lại outer", async () => {
    const r = await runWithTenant("outerx", async () => {
      const inner = await runWithTenant("innerx", () => getTenantSchema());
      return { inner, after: getTenantSchema() };
    });
    expect(r).toEqual({ inner: "innerx", after: "outerx" });
  });
});
