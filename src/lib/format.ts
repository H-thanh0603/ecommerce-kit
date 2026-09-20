import { siteConfig } from "@/config/site";

export function money(value: number) {
  return new Intl.NumberFormat(siteConfig.currency.locale, {
    style: "currency",
    currency: siteConfig.currency.code,
    maximumFractionDigits: 0,
  }).format(value);
}

export function shippingFee(subtotal: number) {
  if (subtotal >= siteConfig.shipping.freeFrom) return 0;
  return siteConfig.shipping.defaultFee;
}

export function discountAmount(
  subtotal: number,
  coupon?: { type: "percent" | "fixed" | "shipping"; value: number; minOrder: number },
) {
  if (!coupon || subtotal < coupon.minOrder) return 0;
  if (coupon.type === "percent") return Math.round((subtotal * coupon.value) / 100);
  if (coupon.type === "fixed") return coupon.value;
  return 0;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
