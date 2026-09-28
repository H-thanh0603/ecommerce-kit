import { describe, expect, it } from "vitest";
import { quoteTotals } from "@/server/pricing";

describe("quoteTotals", () => {
  it("tổng = subtotal + ship - off - points - gift - bundle", () => {
    expect(
      quoteTotals({ subtotal: 600_000, ship: 30_000, off: 60_000, pointsDiscount: 10_000, giftAmount: 20_000, bundleDiscount: 0 })
        .total,
    ).toBe(540_000);
  });

  it("kẹp sàn 0 khi giảm vượt tổng", () => {
    expect(
      quoteTotals({ subtotal: 100_000, ship: 0, off: 0, pointsDiscount: 0, giftAmount: 200_000, bundleDiscount: 0 }).total,
    ).toBe(0);
  });
});
