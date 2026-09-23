import { getEffectiveSiteConfig } from "@/server/settings";
import { shippingFee } from "@/lib/format";

export type ShipQuote = { fee: number; provider: "local" | "ghn"; eta?: string };

export function ghnConfigured() {
  return Boolean(process.env.GHN_TOKEN && process.env.GHN_SHOP_ID);
}

/** Gateway GHN — default là host DEV của GHN; production PHẢI set GHN_BASE_URL thật. */
export function ghnBaseUrl() {
  return (process.env.GHN_BASE_URL || "https://dev-online-gateway.ghn.vn").replace(/\/$/, "");
}

/** Chặn prod âm thầm gọi sandbox/dev (audit Q14/Q155). */
function assertNotDevGatewayInProd() {
  if (process.env.NODE_ENV !== "production") return;
  if (/dev-online|localhost|127\.0\.0\.1/i.test(ghnBaseUrl())) {
    throw new Error(
      `GHN đang trỏ host dev (${ghnBaseUrl()}) — set GHN_BASE_URL=https://ngoai-te-api.ghn.vn (hoặc host production GHN) trước khi chạy production.`,
    );
  }
}

export async function quoteShipping(opts: {
  subtotal: number;
  innerCity?: boolean;
  weightGrams?: number;
  toDistrictId?: number;
  toWardCode?: string;
}): Promise<ShipQuote> {
  const site = await getEffectiveSiteConfig();
  if (site.features.ghn && ghnConfigured() && opts.toDistrictId && opts.toWardCode) {
    assertNotDevGatewayInProd();
    try {
      const res = await fetch(`${ghnBaseUrl()}/shiip/public-api/v2/shipping-order/fee`, {
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
        signal: AbortSignal.timeout(8_000),
      });
      const data = await res.json();
      const fee = Number(data?.data?.total);
      if (Number.isFinite(fee)) {
        return { fee: opts.subtotal >= site.shipping.freeFrom ? 0 : fee, provider: "ghn", eta: "2–3 ngày (GHN)" };
      }
    } catch {
      /* fallback */
    }
  }
  return {
    fee: shippingFee(opts.subtotal, { innerCity: opts.innerCity, schedule: site.shipping }),
    provider: "local",
    eta: site.shipping.estimatedDays,
  };
}

export type GhnCreateInput = {
  toName: string;
  toPhone: string;
  toAddress: string;
  toWardCode: string;
  toDistrictId: number;
  weightGrams?: number;
  codAmount?: number;
  note?: string;
  items: Array<{ name: string; quantity: number; price?: number; weight?: number }>;
};

export type GhnCreateResult = { ok: boolean; orderCode?: string; message: string };

/** Tạo đơn GHN thật, trả về mã vận đơn để lưu vào `Order.ghnOrderCode`. */
export async function createGhnOrder(input: GhnCreateInput): Promise<GhnCreateResult> {
  if (!ghnConfigured()) return { ok: false, message: "Chưa cấu hình GHN_TOKEN / GHN_SHOP_ID" };
  if (!input.toWardCode || !input.toDistrictId || !input.toPhone || !input.toAddress) {
    return { ok: false, message: "Thiếu phường/xã, quận/huyện, SĐT hoặc địa chỉ người nhận" };
  }
  if (!input.items.length) return { ok: false, message: "Đơn trống, không tạo vận đơn" };
  assertNotDevGatewayInProd();
  try {
    const res = await fetch(`${ghnBaseUrl()}/shiip/public-api/v2/shipping-order/create`, {
      method: "POST",
      headers: {
        Token: process.env.GHN_TOKEN!,
        ShopId: process.env.GHN_SHOP_ID!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_type_id: 2,
        note: input.note || "Giao hàng, cho xem hàng",
        required_note: "CHOXEMHANGKHONGTHU",
        to_name: input.toName,
        to_phone: input.toPhone,
        to_address: input.toAddress,
        to_ward_code: input.toWardCode,
        to_district_id: input.toDistrictId,
        weight: Math.max(100, input.weightGrams || 500),
        service_type_id: 2,
        cod_amount: Math.max(0, input.codAmount || 0),
        items: input.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price || 0,
          weight: i.weight || 200,
        })),
      }),
      signal: AbortSignal.timeout(12_000),
    });
    const data = await res.json().catch(() => null);
    const orderCode = data?.data?.order_code as string | undefined;
    if (data?.code === 200 && orderCode) {
      return { ok: true, orderCode, message: "Đã tạo vận đơn GHN" };
    }
    return { ok: false, message: `GHN từ chối: ${data?.message || data?.code || res.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lỗi gọi GHN" };
  }
}
