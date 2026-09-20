import { createHmac } from "crypto";

export function vnpayConfigured() {
  return Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
}

function sortQuery(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

export function buildVnpayUrl(order: { code: string; total: number }, ip = "127.0.0.1") {
  if (!vnpayConfigured()) throw new Error("Chưa cấu hình VNPAY_TMN_CODE / VNPAY_HASH_SECRET");
  const tmn = process.env.VNPAY_TMN_CODE!;
  const secret = process.env.VNPAY_HASH_SECRET!;
  const payUrl = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
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
  const signData = sortQuery(params);
  const hash = createHmac("sha512", secret).update(signData).digest("hex");
  const qs = Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
    .join("&");
  return `${payUrl}?${qs}&vnp_SecureHash=${hash}`;
}

export function verifyVnpay(query: Record<string, string>) {
  const secret = process.env.VNPAY_HASH_SECRET || "";
  const received = query.vnp_SecureHash || "";
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  const signData = sortQuery(params);
  const hash = createHmac("sha512", secret).update(signData).digest("hex");
  return hash === received;
}
