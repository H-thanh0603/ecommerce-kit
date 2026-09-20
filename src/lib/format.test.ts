import { describe, expect, it } from "vitest";
import { discountAmount, isFlashLive, shippingFee } from "./format";

describe("discountAmount", () => {
  it("percent", () => {
    expect(discountAmount(500_000, { type: "percent", value: 10, minOrder: 0 })).toBe(50_000);
  });
  it("min order", () => {
    expect(discountAmount(100_000, { type: "percent", value: 10, minOrder: 300_000 })).toBe(0);
  });
  it("fixed", () => {
    expect(discountAmount(500_000, { type: "fixed", value: 50_000, minOrder: 500_000 })).toBe(50_000);
  });
});

describe("shippingFee", () => {
  it("freeship", () => {
    expect(shippingFee(500_000)).toBe(0);
  });
  it("inner city cheaper", () => {
    expect(shippingFee(100_000, { innerCity: true })).toBe(20_000);
    expect(shippingFee(100_000)).toBe(30_000);
  });
});

describe("isFlashLive", () => {
  it("window", () => {
    expect(isFlashLive({ flashSale: true, flashSaleStartsAt: "2099-01-01" })).toBe(false);
    expect(isFlashLive({ flashSale: true, flashSaleEndsAt: "2000-01-01" })).toBe(false);
    expect(isFlashLive({ flashSale: true })).toBe(true);
    expect(isFlashLive({ flashSale: false })).toBe(false);
  });
});
