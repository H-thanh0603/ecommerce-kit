import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runWithTenant } from "./tenant-context";
import { listCategories, upsertCategory } from "./catalog";
import { ensureSchema, dropSchema } from "./test-schema";

// Giống tenant-settings.test.ts: next/cache ngoài runtime Next ném invariant,
// mock theo keyParts + tags (mô phỏng unstable_cache thật) để RED đúng lỗi
// leak cache key toàn cục — passthrough sẽ không lộ bug này.
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

const S1 = `cat_a_${Date.now()}`;
const S2 = `cat_b_${Date.now()}`;

describe("categories per-tenant (Task 2)", () => {
  beforeAll(async () => {
    await ensureSchema(S1);
    await ensureSchema(S2);
    await runWithTenant(S1, () =>
      upsertCategory({ slug: `shop-a-cat-${Date.now()}`, name: "Shop A Cat" }),
    );
    await runWithTenant(S2, () =>
      upsertCategory({ slug: `shop-b-cat-${Date.now()}`, name: "Shop B Cat" }),
    );
  }, 180_000);

  afterAll(async () => {
    await dropSchema(S1);
    await dropSchema(S2);
  }, 60_000);

  it("listCategories tenant A ≠ tenant B, không lẫn cache", async () => {
    const a = await runWithTenant(S1, () => listCategories());
    const b = await runWithTenant(S2, () => listCategories());
    const namesA = a.map((c) => c.name);
    const namesB = b.map((c) => c.name);
    expect(namesA).toContain("Shop A Cat");
    expect(namesB).toContain("Shop B Cat");
    expect(namesA).not.toContain("Shop B Cat");
    expect(namesB).not.toContain("Shop A Cat");
  }, 60_000);

  it("ghi category mới cùng schema bust cache, đọc thấy giá trị mới", async () => {
    const slug = `shop-a-cat2-${Date.now()}`;
    await runWithTenant(S1, () => listCategories());
    await runWithTenant(S1, () => upsertCategory({ slug, name: "Shop A Cat 2" }));
    const a = await runWithTenant(S1, () => listCategories());
    expect(a.map((c) => c.name)).toContain("Shop A Cat 2");
  }, 60_000);
});
