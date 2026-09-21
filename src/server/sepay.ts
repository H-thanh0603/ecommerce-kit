/**
 * SePay webhook — tự động gạch đơn chuyển khoản.
 * SePay POST JSON về route này, kèm header `Authorization: Apikey <SEPAY_API_KEY>`.
 * Khách ghi nội dung CK là mã đơn (VD: ATL-00012) thì đơn tự chuyển paid.
 */

export function sepayConfigured() {
  return Boolean(process.env.SEPAY_API_KEY);
}

export function extractOrderCode(content: string): string | null {
  const m = /ATL-\d{5}/i.exec(content || "");
  return m ? m[0].toUpperCase() : null;
}

export type SepayStore = {
  findOrder: (code: string) => Promise<{ code: string; total: number; paymentStatus: string; paymentMethod: string } | null>;
  markPaid: (code: string) => Promise<void>;
};

export async function handleSepayWebhook(
  headers: { authorization?: string },
  body: { content?: string; transferAmount?: number; code?: string },
  store: SepayStore,
): Promise<{ ok: boolean; message: string }> {
  if (!sepayConfigured()) return { ok: false, message: "Chưa cấu hình SEPAY_API_KEY" };
  const auth = headers.authorization || "";
  if (auth !== `Apikey ${process.env.SEPAY_API_KEY}` && auth !== `Bearer ${process.env.SEPAY_API_KEY}`) {
    return { ok: false, message: "Sai API key" };
  }
  const code = extractOrderCode(`${body.content || ""} ${body.code || ""}`);
  if (!code) return { ok: true, message: "Bỏ qua: không thấy mã đơn" };
  const order = await store.findOrder(code).catch(() => null);
  if (!order) return { ok: true, message: "Bỏ qua: không thấy đơn" };
  if (order.paymentStatus === "paid") return { ok: true, message: "Đơn đã paid" };
  if (Number(body.transferAmount || 0) < order.total) {
    return { ok: true, message: `Bỏ qua: CK ${body.transferAmount} < tổng ${order.total}` };
  }
  await store.markPaid(code);
  return { ok: true, message: `Đã gạch đơn ${code}` };
}
