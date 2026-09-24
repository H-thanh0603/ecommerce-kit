import { describe, expect, it } from "vitest";
import { mergeSiteConfig, siteSettingsInput } from "./settings";
import { siteConfig } from "@/config/site";

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
