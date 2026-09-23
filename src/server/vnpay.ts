import { createHmac } from "crypto";
import { safeEqual } from "@/server/crypto-util";
import { assertProdGateway } from "@/server/gateway-guard";

/**
 * VNPay adapter — đúng quy ước ký của cổng (sắp xếp key, encode value rồi mới hash).
 * Luồng tiền production: createOrder → buildVnpayUrl → khách trả → VNPay gọi IPN
 * → handleVnpayIpn (verify checksum + đối chiếu amount + idempotent) → return URL.
 */

export function vnpayConfigured() {
  return Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
}

function vnpEncode(value: string) {
  return encodeURIComponent(value);
}

/** Chuỗi ký: sort key, dạng k=encode(v) nối bằng &. */
export function signVnpayParams(params: Record<string, string>, secret: string) {
  const signData = Object.keys(params)
    .sort()
    .map((k) => `${vnpEncode(k)}=${vnpEncode(params[k])}`)
    .join("&");
  return createHmac("sha512", secret).update(Buffer.from(signData, "utf-8")).digest("hex");
}

export function buildVnpayUrl(order: { code: string; total: number }, ip = "127.0.0.1") {
  if (!vnpayConfigured()) throw new Error("Chưa cấu hình VNPAY_TMN_CODE / VNPAY_HASH_SECRET");
  const tmn = process.env.VNPAY_TMN_CODE!;
  const secret = process.env.VNPAY_HASH_SECRET!;
  const payUrl = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  assertProdGateway("VNPay", payUrl);
  const app = process.env.APP_URL || "http://localhost:3000";
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const createDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmn,
    vnp_Amount: String(order.total * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: order.code,
    vnp_OrderInfo: `Thanh toan don ${order.code}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: `${app}/api/payments/vnpay/return`,
    vnp_IpAddr: ip.replace("::1", "127.0.0.1"),
    vnp_CreateDate: createDate,
  };
  const hash = signVnpayParams(params, secret);
  const qs = Object.keys(params)
    .sort()
    .map((k) => `${vnpEncode(k)}=${vnpEncode(params[k])}`)
    .join("&");
  return `${payUrl}?${qs}&vnp_SecureHash=${hash}`;
}

export function verifyVnpay(query: Record<string, string>) {
  const secret = process.env.VNPAY_HASH_SECRET || "";
  const received = query.vnp_SecureHash || "";
  if (!received || !secret) return false;
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  const hash = signVnpayParams(params, secret);
  return safeEqual(hash, received);
}

export type VnpOrderRecord = { code: string; total: number; paymentStatus: string };
export type VnpIpnResult = { RspCode: string; Message: string };
export type VnpOrderStore = {
  findOrder: (code: string) => Promise<VnpOrderRecord | null>;
  markPaid: (code: string) => Promise<void>;
  markFailed: (code: string) => Promise<void>;
};

/**
 * Xử lý IPN theo đúng mã của VNPay — pure khỏi Prisma để test được:
 * 97 sai checksum · 01 không thấy đơn · 04 sai số tiền · 02 đã xác nhận
 * · 00 ghi nhận thành công (kể cả giao dịch thất bại, để cổng ngừng retry).
 */
export async function handleVnpayIpn(
  query: Record<string, string>,
  store: VnpOrderStore,
): Promise<VnpIpnResult> {  if (!verifyVnpay(query)) return { RspCode: "97", Message: "Fail checksum" };
  const code = (query.vnp_TxnRef || "").trim();
  if (!code) return { RspCode: "01", Message: "Order not found" };
  let order: VnpOrderRecord | null;
  try {
    order = await store.findOrder(code);
  } catch {
    return { RspCode: "99", Message: "Unknown error" };
  }
  if (!order) return { RspCode: "01", Message: "Order not found" };
  const amount = Math.floor(Number(query.vnp_Amount || "0") / 100);
  if (!Number.isFinite(amount) || amount !== order.total) {
    return { RspCode: "04", Message: "Invalid amount" };
  }
  if (order.paymentStatus === "paid") return { RspCode: "02", Message: "Order already confirmed" };
  try {
    if (query.vnp_ResponseCode === "00") {
      await store.markPaid(code);
      return { RspCode: "00", Message: "Success" };
    }
    await store.markFailed(code);
    return { RspCode: "00", Message: "Recorded failed payment" };
  } catch {
    return { RspCode: "99", Message: "Unknown error" };
  }
}

export type VnpRefundInput = {
  txnRef: string;
  amount: number;
  transactionNo: string;
  transactionDate: string;
  createdBy: string;
  ip?: string;
  full?: boolean;
  orderInfo?: string;
};

/** Dựng request hoàn tiền VNPay (merchant_webapi) — pure để test chữ ký. */
export function buildVnpayRefund(input: VnpRefundInput) {
  if (!vnpayConfigured()) throw new Error("Chưa cấu hình VNPAY_TMN_CODE / VNPAY_HASH_SECRET");
  const tmn = process.env.VNPAY_TMN_CODE!;
  const secret = process.env.VNPAY_HASH_SECRET!;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const createDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const p = {
    vnp_RequestId: `${input.txnRef}-${Date.now()}`,
    vnp_Version: "2.1.0",
    vnp_Command: "refund",
    vnp_TmnCode: tmn,
    vnp_TransactionType: input.full === false ? "03" : "02",
    vnp_TxnRef: input.txnRef,
    vnp_Amount: String(Math.round(input.amount) * 100),
    vnp_OrderInfo: input.orderInfo || `Hoan tien don ${input.txnRef}`,
    vnp_TransactionNo: input.transactionNo,
    vnp_TransactionDate: input.transactionDate,
    vnp_CreateBy: input.createdBy,
    vnp_CreateDate: createDate,
    vnp_IpAddr: (input.ip || "127.0.0.1").replace("::1", "127.0.0.1"),
  };
  const raw = [
    p.vnp_RequestId, p.vnp_Version, p.vnp_Command, p.vnp_TmnCode, p.vnp_TransactionType,
    p.vnp_TxnRef, p.vnp_Amount, p.vnp_TransactionNo, p.vnp_TransactionDate,
    p.vnp_CreateBy, p.vnp_CreateDate, p.vnp_IpAddr, p.vnp_OrderInfo,
  ].join("|");
  const vnp_SecureHash = createHmac("sha512", secret).update(Buffer.from(raw, "utf-8")).digest("hex");
  return { ...p, vnp_SecureHash };
}

/** Gọi hoàn tiền thật — cần VNPAY_API_URL + key production, test tay 1 đơn sandbox trước. */
export async function refundVnpay(input: VnpRefundInput) {
  const api = process.env.VNPAY_API_URL || "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";
  assertProdGateway("VNPay refund", api);
  const body = buildVnpayRefund(input);
  const res = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => null);
  if (data?.vnp_ResponseCode === "00") return { ok: true as const, message: "Hoàn tiền thành công" };
  return { ok: false as const, message: `VNPay từ chối: ${data?.vnp_Message || data?.vnp_ResponseCode || res.status}` };
}
