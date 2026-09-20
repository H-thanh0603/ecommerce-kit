import { isEnabled, siteConfig } from "@/config/site";
import { shippingFee } from "@/lib/format";

export type ShipQuote = { fee: number; provider: "local" | "ghn"; eta?: string };

export function ghnConfigured() {
  return Boolean(process.env.GHN_TOKEN && process.env.GHN_SHOP_ID);
}

export async function quoteShipping(opts: {
  subtotal: number;
  innerCity?: boolean;
  weightGrams?: number;
  toDistrictId?: number;
  toWardCode?: string;
}): Promise<ShipQuote> {
  if (isEnabled("ghn") && ghnConfigured() && opts.toDistrictId && opts.toWardCode) {
    try {
      const res = await fetch("https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee", {
        method: "POST",
        headers: {
          Token: process.env.GHN_TOKEN!,
          ShopId: process.env.GHN_SHOP_ID!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_type_id: 2,
          to_district_id: opts.toDistrictId,
          to_ward_code: opts.toWardCode,
          weight: Math.max(100, opts.weightGrams || 500),
          insurance_value: opts.subtotal,
        }),
      });
      const data = await res.json();
      const fee = Number(data?.data?.total);
      if (Number.isFinite(fee)) {
        return { fee: opts.subtotal >= siteConfig.shipping.freeFrom ? 0 : fee, provider: "ghn", eta: "2–3 ngày (GHN)" };
      }
    } catch {
      /* fallback */
    }
  }
  return {
    fee: shippingFee(opts.subtotal, { innerCity: opts.innerCity }),
    provider: "local",
    eta: siteConfig.shipping.estimatedDays,
  };
}
