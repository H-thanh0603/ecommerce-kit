import { siteConfig } from "@/config/site";

export function money(value: number) {
  return new Intl.NumberFormat(siteConfig.currency.locale, {
    style: "currency",
    currency: siteConfig.currency.code,
    maximumFractionDigits: 0,
  }).format(value);
}

export type ShippingSchedule = { freeFrom: number; defaultFee: number; innerCityFee: number };

export function shippingFee(
  subtotal: number,
  opts?: { innerCity?: boolean; schedule?: ShippingSchedule },
) {
  const s = opts?.schedule ?? siteConfig.shipping;
  if (subtotal >= s.freeFrom) return 0;
  return opts?.innerCity ? s.innerCityFee : s.defaultFee;
}

export function isFlashLive(p: {
  flashSale?: boolean;
  flashSaleStartsAt?: string | Date | null;
  flashSaleEndsAt?: string | Date | null;
}) {
  if (!p.flashSale) return false;
  const now = Date.now();
  if (p.flashSaleStartsAt && new Date(p.flashSaleStartsAt).getTime() > now) return false;
  if (p.flashSaleEndsAt && new Date(p.flashSaleEndsAt).getTime() < now) return false;
  return true;
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

export function qtyLabel(qty: number, unit?: string) {
  if (unit === "kg") return `${(qty / 1000).toFixed(qty % 100 === 0 ? 1 : 2)} kg`;
  return `× ${qty}`;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
