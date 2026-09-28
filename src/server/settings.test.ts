import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getEffectiveSiteConfig, mergeSiteConfig, saveSiteSettings, siteSettingsInput } from "./settings";
import { runWithTenant } from "./tenant-context";
import { ensureSchema, dropSchema } from "./test-schema";
import { siteConfig } from "@/config/site";

// next/cache ngoài runtime Next ném invariant — mock theo keyParts + tags
// (giống tenant-settings.test.ts) để test DB đọc đúng loader thật.
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

describe("mergeSiteConfig", () => {
  it("không override thì giữ nguyên file mặc định", () => {
    const eff = mergeSiteConfig({});
    expect(eff.brand.name).toBe(siteConfig.brand.name);
    expect(eff.shipping.freeFrom).toBe(siteConfig.shipping.freeFrom);
    expect(eff.features.coupons).toBe(siteConfig.features.coupons);
  });

  it("override từng phần, phần còn lại giữ default", () => {
    const eff = mergeSiteConfig({
      brand: { name: "Shop Mới" },
      shipping: { freeFrom: 0 },
      features: { ghn: true },
    });
    expect(eff.brand.name).toBe("Shop Mới");
    expect(eff.brand.hotline).toBe(siteConfig.brand.hotline);
    expect(eff.shipping.freeFrom).toBe(0);
    expect(eff.shipping.defaultFee).toBe(siteConfig.shipping.defaultFee);
    expect(eff.features.ghn).toBe(true);
    expect(eff.features.coupons).toBe(siteConfig.features.coupons);
  });

  it("ghi đè số tài khoản, giữ ngân hàng mặc định", () => {
    const eff = mergeSiteConfig({
      payments: {
        bankTransfer: {
          ...siteConfig.payments.bankTransfer,
          accountNumber: "999",
        },
      },
    });
    expect(eff.payments.bankTransfer.accountNumber).toBe("999");
    expect(eff.payments.bankTransfer.bank).toBe(siteConfig.payments.bankTransfer.bank);
    expect(eff.payments.cod.enabled).toBe(siteConfig.payments.cod.enabled);
  });

  it("bỏ qua key features lạ, không crash", () => {
    const eff = mergeSiteConfig({ features: { khong_ton_tai: true } as never });
    expect(eff.features.coupons).toBe(siteConfig.features.coupons);
  });
});

describe("siteSettingsInput", () => {
  it("chặn màu hex sai và số âm", () => {
    expect(() => siteSettingsInput.parse({ theme: { primary: "red" } }).theme).toThrow();
    expect(() => siteSettingsInput.parse({ shipping: { freeFrom: -1 } })).toThrow();
  });

  it("cho lưu từng phần (partial)", () => {
    const p = siteSettingsInput.parse({ brand: { name: "OK" } });
    expect(p.brand?.name).toBe("OK");
  });
});

const S_PAY_HOME = `set_ph_${Date.now()}`;

describe("settings payments/home overrides (Task 1)", () => {
  beforeAll(async () => {
    await ensureSchema(S_PAY_HOME);
  }, 180_000);

  afterAll(async () => {
    await dropSchema(S_PAY_HOME);
  }, 60_000);

  it("admin lưu payments/home → storefront đọc hiệu lực", async () => {
    const saved = await runWithTenant(S_PAY_HOME, () =>
      saveSiteSettings({ payments: { cod: { enabled: false, label: "COD off" } }, home: { eyebrow: "Test Home" } }),
    );
    expect(saved.payments.cod.enabled).toBe(false);
    const eff = await runWithTenant(S_PAY_HOME, () => getEffectiveSiteConfig());
    expect(eff.payments.cod.enabled).toBe(false);
    expect(eff.home.eyebrow).toBe("Test Home");
  }, 60_000);
});
