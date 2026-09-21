import { createHmac } from "crypto";

/**
 * MoMo adapter (gateway v2).
 * createOrder → buildMomoPayUrl → khách trả → MoMo gọi IPN (POST JSON)
 * → handleMomoIpn (verify chữ ký + đối chiếu amount + idempotent) → return URL.
 */

export function momoConfigured() {
  return Boolean(process.env.MOMO_PARTNER_CODE && process.env.MOMO_ACCESS_KEY && process.env.MOMO_SECRET_KEY);
}

function hmacHex(secret: string, raw: string) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

function momoApi() {
  return process.env.MOMO_URL || "https://test-payment.momo.vn/v2/gateway/api/create";
}

export function signMomoCreate(p: {
  accessKey: string;
  amount: string;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
  secretKey: string;
}) {
  const raw = `accessKey=${p.accessKey}&amount=${p.amount}&extraData=${p.extraData}&ipnUrl=${p.ipnUrl}&orderId=${p.orderId}&orderInfo=${p.orderInfo}&partnerCode=${p.partnerCode}&redirectUrl=${p.redirectUrl}&requestId=${p.requestId}&requestType=${p.requestType}`;
  return hmacHex(p.secretKey, raw);
}

export async function buildMomoPayUrl(order: { code: string; total: number }): Promise<{ ok: boolean; payUrl?: string; message: string }> {
  if (!momoConfigured()) return { ok: false, message: "Chưa cấu hình MOMO_PARTNER_CODE / ACCESS_KEY / SECRET_KEY" };
  const app = process.env.APP_URL || "http://localhost:3000";
  const body = {
    partnerCode: process.env.MOMO_PARTNER_CODE!,
    accessKey: process.env.MOMO_ACCESS_KEY!,
    requestId: `${order.code}-${Date.now()}`,
    amount: String(order.total),
    orderId: order.code,
    orderInfo: `Thanh toan don ${order.code}`,
    redirectUrl: `${app}/api/payments/momo/return`,
    ipnUrl: `${app}/api/payments/momo/ipn`,
    lang: "vi",
    requestType: "captureWallet",
    extraData: "",
  };
  const signature = signMomoCreate({ ...body, secretKey: process.env.MOMO_SECRET_KEY! });
  try {
    const res = await fetch(momoApi(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, signature }),
    });
    const data = await res.json().catch(() => null);
    if (data?.resultCode === 0 && data?.payUrl) {
      return { ok: true, payUrl: data.payUrl, message: "Chuyển cổng MoMo" };
    }
    return { ok: false, message: `MoMo từ chối: ${data?.message || data?.resultCode || res.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lỗi gọi MoMo" };
  }
}

export function verifyMomoIpn(data: Record<string, string | number>) {
  const secret = process.env.MOMO_SECRET_KEY || "";
  if (!secret || !data.signature) return false;
  const s = (k: string) => String(data[k] ?? "");
  const raw =
    `accessKey=${process.env.MOMO_ACCESS_KEY || ""}` +
    `&amount=${s("amount")}&extraData=${s("extraData")}&message=${s("message")}` +
    `&orderId=${s("orderId")}&orderInfo=${s("orderInfo")}&orderType=${s("orderType")}` +
    `&partnerCode=${s("partnerCode")}&payType=${s("payType")}&requestId=${s("requestId")}` +
    `&responseTime=${s("responseTime")}&resultCode=${s("resultCode")}&transId=${s("transId")}`;
  return hmacHex(secret, raw) === String(data.signature);
}

export type MomoOrderStore = {
  findOrder: (code: string) => Promise<{ code: string; total: number; paymentStatus: string } | null>;
  markPaid: (code: string, transId?: string) => Promise<void>;
  markFailed: (code: string) => Promise<void>;
};

export async function handleMomoIpn(
  data: Record<string, string | number>,
  store: MomoOrderStore,
): Promise<{ ok: boolean; message: string }> {
  if (!verifyMomoIpn(data)) return { ok: false, message: "Fail checksum" };
  const code = String(data.orderId || "").trim();
  if (!code) return { ok: false, message: "Order not found" };
  const order = await store.findOrder(code).catch(() => null);
  if (!order) return { ok: false, message: "Order not found" };
  if (Number(data.amount) !== order.total) return { ok: false, message: "Invalid amount" };
  if (order.paymentStatus === "paid") return { ok: true, message: "Already confirmed" };
  if (Number(data.resultCode) === 0) {
    await store.markPaid(code, String(data.transId || ""));
    return { ok: true, message: "Success" };
  }
  await store.markFailed(code);
  return { ok: true, message: "Recorded failed payment" };
}

export type MomoRefundInput = { orderId: string; amount: number; transId: string; description?: string };

/** Dựng request hoàn tiền MoMo — pure để test chữ ký. */
export function buildMomoRefund(input: MomoRefundInput) {
  if (!momoConfigured()) throw new Error("Chưa cấu hình MOMO_PARTNER_CODE / ACCESS_KEY / SECRET_KEY");
  const body = {
    partnerCode: process.env.MOMO_PARTNER_CODE!,
    orderId: input.orderId,
    requestId: `${input.orderId}-refund-${Date.now()}`,
    amount: String(Math.round(input.amount)),
    transId: input.transId,
    lang: "vi",
    description: (input.description || `Hoan tien don ${input.orderId}`).slice(0, 100),
  };
  const raw =
    `accessKey=${process.env.MOMO_ACCESS_KEY!}&amount=${body.amount}&description=${body.description}` +
    `&orderId=${body.orderId}&partnerCode=${body.partnerCode}&requestId=${body.requestId}&transId=${body.transId}`;
  const signature = hmacHex(process.env.MOMO_SECRET_KEY!, raw);
  return { ...body, signature };
}

function momoRefundApi() {
  return process.env.MOMO_REFUND_URL || "https://test-payment.momo.vn/v2/gateway/api/refund";
}

/** Gọi hoàn tiền thật — cần transId gốc (lưu ở Order.paymentRef), test tay sandbox trước. */
export async function refundMomo(input: MomoRefundInput) {
  const body = buildMomoRefund(input);
  const res = await fetch(momoRefundApi(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (data?.resultCode === 0) return { ok: true as const, message: "Hoàn tiền thành công" };
  return { ok: false as const, message: `MoMo từ chối: ${data?.message || data?.resultCode || res.status}` };
}
