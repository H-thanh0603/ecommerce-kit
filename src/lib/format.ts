import { siteConfig } from "@/config/site";

export type MoneyLocale = { code: string; locale: string };

export function money(value: number, currency?: MoneyLocale) {
  const c = currency ?? siteConfig.currency;
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency: c.code,
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

/** URL ảnh VietQR (vietqr.io) cho chuyển khoản — pure để test. */
export function vietQrUrl(opts: {
  shortCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  addInfo: string;
}) {
  const params = new URLSearchParams({
    amount: String(Math.max(0, Math.round(opts.amount))),
    addInfo: opts.addInfo.slice(0, 25),
    accountName: opts.accountName,
  });
  return `https://img.vietqr.io/image/${opts.shortCode}-${opts.accountNumber}-compact2.png?${params}`;
}

/** Chuẩn hoá tiếng Việt để tìm kiếm: "Áo Dài" → "ao dai". */
export function normVi(raw: string) {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
