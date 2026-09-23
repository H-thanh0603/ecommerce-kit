import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runWithTenant } from "./tenant-context";
import { saveSiteSettings, getEffectiveSiteConfig } from "./settings";
import { ensureSchema, dropSchema } from "./test-schema";

// Deviation bắt buộc: next/cache ngoài runtime Next ném invariant
// ("static generation store missing" / "incrementalCache missing").
// Mock theo keyParts + tags (mô phỏng unstable_cache thật) để RED đúng lỗi
// brand lẫn do cache key toàn cục — passthrough sẽ không lộ bug này.
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

const S1 = `set_a_${Date.now()}`;
const S2 = `set_b_${Date.now()}`;

describe("settings per-tenant (T7)", () => {
  beforeAll(async () => {
    await ensureSchema(S1);
    await ensureSchema(S2);
  }, 180_000);

  afterAll(async () => {
    await dropSchema(S1);
    await dropSchema(S2);
  }, 60_000);

  it("brand shop A ≠ shop B, không lẫn cache", async () => {
    await runWithTenant(S1, () => saveSiteSettings({ brand: { name: "Shop AAA" } }));
    await runWithTenant(S2, () => saveSiteSettings({ brand: { name: "Shop BBB" } }));
    const a = await runWithTenant(S1, () => getEffectiveSiteConfig());
    const b = await runWithTenant(S2, () => getEffectiveSiteConfig());
    expect(a.brand.name).toBe("Shop AAA");
    expect(b.brand.name).toBe("Shop BBB");
    // Cache hit vẫn đúng
    const a2 = await runWithTenant(S1, () => getEffectiveSiteConfig());
    expect(a2.brand.name).toBe("Shop AAA");
  }, 60_000);

  it("save lần 2 cùng schema bust cache, đọc thấy giá trị mới", async () => {
    // Self-contained: tự set X rồi Y trong test — không phụ thuộc test trên.
    // Nếu tag lệch schema (revert về SETTINGS_TAG trần) thì đọc vẫn ra X → fail.
    await runWithTenant(S1, () => saveSiteSettings({ brand: { name: "Shop X1" } }));
    expect((await runWithTenant(S1, () => getEffectiveSiteConfig())).brand.name).toBe("Shop X1");
    await runWithTenant(S1, () => saveSiteSettings({ brand: { name: "Shop Y2" } }));
    expect((await runWithTenant(S1, () => getEffectiveSiteConfig())).brand.name).toBe("Shop Y2");
  }, 30_000);
});
