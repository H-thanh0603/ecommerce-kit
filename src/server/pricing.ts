import { prisma } from "@/server/db";
import { discountAmount } from "@/lib/format";
import { quoteShipping } from "@/server/shipping";
import { assertCoupon } from "@/server/coupon";
import { quoteGift } from "@/server/giftcard";
import { quoteBundle } from "@/server/bundle";
import { discountFromPoints } from "@/server/membership";
import { isFeatureOn } from "@/server/settings";
import { lineAmount } from "@/types";

export type TotalsInput = {
  subtotal: number;
  ship: number;
  off: number;
  pointsDiscount: number;
  giftAmount: number;
  bundleDiscount: number;
};

/** Pure: tổng đơn = max(0, subtotal + ship - off - points - gift - bundle). */
export function quoteTotals(a: TotalsInput) {
  return {
    total: Math.max(0, a.subtotal + a.ship - a.off - a.pointsDiscount - a.giftAmount - a.bundleDiscount),
  };
}

export type QuoteLine = {
  productId: string;
  skuId?: string;
  price: number;
  quantity: number;
  unit?: string;
  weightGrams?: number;
};

export type QuoteOrderInput = {
  lines: QuoteLine[];
  couponCode?: string;
  email?: string;
  userId?: string;
  innerCity?: boolean;
  toDistrictId?: number;
  toWardCode?: string;
  giftCode?: string;
  bundleId?: string;
  pointsToUse?: number;
};

export type QuoteOrderResult = {
  subtotal: number;
  coupon: Awaited<ReturnType<typeof assertCoupon>> | null;
  shipRaw: number;
  ship: number;
  off: number;
  pointsDiscount: number;
  pointsToUse: number;
  gift: Awaited<ReturnType<typeof quoteGift>> | null;
  giftAmount: number;
  bundle: Awaited<ReturnType<typeof quoteBundle>> | null;
  bundleDiscount: number;
  total: number;
};

/**
 * Pipeline tính giá đơn (tách từ createOrder): subtotal → coupon → ship →
 * điểm → gift → bundle → total. Static import (không còn await import).
 */
export async function quoteOrder(input: QuoteOrderInput): Promise<QuoteOrderResult> {
  const subtotal = input.lines.reduce(
    (s, l) => s + lineAmount(l.price, l.quantity, l.unit === "kg" ? "kg" : "cai"),
    0,
  );
  const coupon = input.couponCode
    ? await assertCoupon(input.couponCode, subtotal, input.email, input.userId)
    : null;
  const weightGrams = input.lines.reduce(
    (s, l) => s + (l.weightGrams || 500) * (l.unit === "kg" ? 1 : l.quantity),
    0,
  );
  const quote = await quoteShipping({
    subtotal,
    innerCity: input.innerCity,
    weightGrams,
    toDistrictId: input.toDistrictId,
    toWardCode: input.toWardCode,
  });
  const shipRaw = quote.fee;
  const ship = coupon?.type === "shipping" ? 0 : shipRaw;
  const off = coupon
    ? discountAmount(subtotal, {
        type: coupon.type as "percent" | "fixed" | "shipping",
        value: coupon.value,
        minOrder: coupon.minOrder,
      })
    : 0;
  let pointsDiscount = 0;
  let pointsToUse = 0;
  if ((await isFeatureOn("membership")) && input.userId && input.pointsToUse) {
    const raw = input.pointsToUse;
    if (!Number.isInteger(raw) || raw < 0) throw new Error("Số điểm không hợp lệ");
    if (raw > 0) {
      const member = await prisma.user.findUnique({ where: { id: input.userId }, select: { points: true } });
      if (!member || member.points < raw) throw new Error("Không đủ điểm để dùng");
      pointsToUse = raw;
      pointsDiscount = discountFromPoints(raw);
    }
  }
  const gift = input.giftCode ? await quoteGift(input.giftCode, subtotal + shipRaw - off - pointsDiscount) : null;
  const giftAmount = gift?.amount || 0;
  const bundle = input.bundleId
    ? await quoteBundle(
        input.bundleId,
        input.lines.map((l) => ({
          productId: l.productId,
          skuId: l.skuId,
          price: l.price,
          quantity: l.quantity,
          unit: l.unit,
        })),
      )
    : null;
  const bundleDiscount = bundle?.discount || 0;
  const { total } = quoteTotals({ subtotal, ship, off, pointsDiscount, giftAmount, bundleDiscount });
  return { subtotal, coupon, shipRaw, ship, off, pointsDiscount, pointsToUse, gift, giftAmount, bundle, bundleDiscount, total };
}
