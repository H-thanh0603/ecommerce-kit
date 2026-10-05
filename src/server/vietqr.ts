import { createHmac } from "crypto";
import { siteConfig } from "@/config/site";
import { safeEqual } from "@/server/crypto-util";
import { vietQrUrl } from "@/lib/format";

/**
 * VietQR adapter — QR chuyển khoản cho đơn hàng (không cổng redirect như MoMo/VNPay).
 * createOrder → payments.ts ghi đơn "pending" → trang thành công hiển thị QR
 * (addInfo = mã đơn) → xác nhận bằng 1 trong 2 đường:
 *  · IPN/webhook (gateway trung gian): POST raw JSON + header `x-vietqr-signature`
 *    = HMAC-SHA256(raw body, VIETQR_WEBHOOK_SECRET) → handleVietqrIpn (idempotent).
 *  · khách bấm "Tôi đã chuyển khoản" → checkVietqrTransaction dò giao dịch qua
 *    SePay API (SEPAY_API_KEY, cùng nhà cung cấp với sepay.ts).
 */

export type VietqrBankConfig = {
  bank: string;
  shortCode: string;
  accountName: string;
  accountNumber: string;
};

/** Tài khoản nhận tiền: env override, mặc định dùng tài khoản chuyển khoản của shop. */
export function vietqrBank(): VietqrBankConfig {
  const def = siteConfig.payments.bankTransfer;
  return {
    bank: process.env.VIETQR_BANK_NAME || def.bank,
    shortCode: process.env.VIETQR_BANK_SHORT_CODE || def.shortCode,
    accountName: process.env.VIETQR_ACCOUNT_NAME || def.accountName,
    accountNumber: process.env.VIETQR_ACCOUNT_NUMBER || def.accountNumber,
  };
}

export function vietqrConfigured() {
  const c = vietqrBank();
  return Boolean(c.shortCode && c.accountNumber && c.accountName);
}

export function buildVietqrPayUrl(
  order: { code: string; total: number },
  cfg: VietqrBankConfig = vietqrBank(),
): { ok: boolean; payUrl: string; addInfo: string; message: string } {
  if (!cfg.shortCode || !cfg.accountNumber || !cfg.accountName) {
    return { ok: false, payUrl: "", addInfo: order.code, message: "Chưa cấu hình tài khoản nhận VietQR" };
  }
  // Nội dung CK = đúng mã đơn (EK-00012) để đối soát/IPN dò được.
  const addInfo = order.code;
  return {
    ok: true,
    payUrl: vietQrUrl({
      shortCode: cfg.shortCode,
      accountNumber: cfg.accountNumber,
      accountName: cfg.accountName,
      amount: order.total,
      addInfo,
    }),
    addInfo,
    message: "Quét mã QR để chuyển khoản",
  };
}

export function signVietqrPayload(raw: string, secret = process.env.VIETQR_WEBHOOK_SECRET || "") {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export function verifyVietqr(raw: string, signature: string, secret = process.env.VIETQR_WEBHOOK_SECRET || "") {
  if (!secret || !signature) return false;
  return safeEqual(signVietqrPayload(raw, secret), signature);
}

const codePrefix = siteConfig.orders.codePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tách mã đơn khỏi nội dung chuyển khoản — cùng tiền tố với sepay.ts.
 *  Mã đơn 5-12 ký tự hoa/số (cũ 5 chữ số, mới 8 ký tự ngẫu nhiên). */
export function extractVietqrOrderCode(content: string): string | null {
  const m = new RegExp(`${codePrefix}-[A-Z0-9]{5,12}(?![A-Z0-9])`, "i").exec(content || "");
  return m ? m[0].toUpperCase() : null;
}

export type VietqrOrderStore = {
  findOrder: (code: string) => Promise<{ code: string; total: number; paymentStatus: string } | null>;
  markPaid: (code: string, ref?: string) => Promise<void>;
};

export type VietqrIpnResult = { ok: boolean; message: string; alreadyPaid?: boolean };

/**
 * Xử lý webhook: verify chữ ký trên raw body → tách mã đơn từ nội dung CK
 * → đối chiếu số tiền (CK thừa vẫn nhận) → idempotent khi đơn đã paid.
 */
export async function handleVietqrIpn(
  raw: string,
  signature: string,
  store: VietqrOrderStore,
): Promise<VietqrIpnResult> {
  if (!verifyVietqr(raw, signature)) return { ok: false, message: "Fail signature" };
  const body = JSON.parse(raw) as { content?: string; description?: string; transferAmount?: number; referenceCode?: string };
  const code = extractVietqrOrderCode(`${body.content || ""} ${body.description || ""}`);
  if (!code) return { ok: false, message: "Không thấy mã đơn trong nội dung chuyển khoản" };
  const order = await store.findOrder(code).catch(() => null);
  if (!order) return { ok: false, message: "Order not found" };
  if (Number(body.transferAmount || 0) < order.total) return { ok: false, message: "Invalid amount" };
  if (order.paymentStatus === "paid") return { ok: true, message: "Already confirmed", alreadyPaid: true };
  await store.markPaid(code, body.referenceCode || "");
  return { ok: true, message: "Success" };
}

export type VietqrCheckResult = { ok: boolean; paid: boolean; message: string };

type SePayTx = { content?: string; amount?: number };
type VietqrFetcher = (url: string, init?: RequestInit) => Promise<Pick<Response, "json">>;

/** Dò giao dịch qua SePay — fetcher inject để test; mặc định 50 giao dịch gần nhất. */
export async function checkVietqrTransaction(
  order: { code: string; total: number },
  opts: { apiKey?: string; fetcher?: VietqrFetcher } = {},
): Promise<VietqrCheckResult> {
  const apiKey = opts.apiKey ?? (process.env.SEPAY_API_KEY || "");
  if (!apiKey) return { ok: false, paid: false, message: "Chưa cấu hình SEPAY_API_KEY — không dò giao dịch được" };
  const doFetch = opts.fetcher ?? fetch;
  try {
    const res = await doFetch("https://my.sepay.vn/userapi/transactions/list?limit=50", {
      headers: { Authorization: `Apikey ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as { data?: { transactions?: SePayTx[] } } | null;
    const txs = data?.data?.transactions || [];
    const hit = txs.find(
      (t) =>
        Number(t.amount || 0) >= order.total &&
        (t.content || "").toLowerCase().includes(order.code.toLowerCase()),
    );
    if (hit) return { ok: true, paid: true, message: `Đã thấy giao dịch ${order.code} — xác nhận thanh toán` };
    return { ok: true, paid: false, message: "Chưa thấy giao dịch khớp — đơn vẫn chờ đối soát (webhook sẽ tự gạch khi tiền về)" };
  } catch (e) {
    return { ok: false, paid: false, message: e instanceof Error ? e.message : "Lỗi dò giao dịch" };
  }
}
