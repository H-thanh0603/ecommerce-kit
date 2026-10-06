import { NextResponse } from "next/server";
import { handleVnpayIpn } from "@/server/vnpay";
import { logOrderEventByCode } from "@/server/order-events";
import { prisma } from "@/server/db";
import { resolveTenant, withDefaultTenant, wireTenantLookup } from "@/server/tenant";
import { runWithTenant } from "@/server/tenant-context";

export async function GET(req: Request) {
  wireTenantLookup(); // idempotent — IPN không đi qua root layout
  const host = req.headers.get("host") || "";
  const tenant = host ? await resolveTenant(host).catch(() => null) : null;
  // IPN không tin Host tuyệt đối: không resolve được → DEFAULT_TENANT (T5).
  const run = <T,>(fn: () => T) => (tenant ? runWithTenant(tenant.slug, fn) : withDefaultTenant(fn));
  const result = await run(async () => {
    const url = new URL(req.url);
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    let firstPaid = false;
    const r = await handleVnpayIpn(query, {
      findOrder: async (code) =>
        prisma.order.findUnique({ where: { code }, select: { code: true, total: true, paymentStatus: true } }),
      markPaid: async (code) => {
        // Guard `not: "paid"` chống race return/IPN — nhất quán với momo/vietqr.
        const res = await prisma.order.updateMany({
          where: { code, paymentStatus: { not: "paid" } },
          data: { paymentStatus: "paid", paymentRef: query.vnp_TransactionNo || "" },
        });
        firstPaid = res.count === 1;
        return firstPaid;
      },
      markFailed: async (code) => {
        await prisma.order.updateMany({ where: { code }, data: { paymentStatus: "failed" } });
      },
    });
    if (r.RspCode === "00") {
      await logOrderEventByCode(query.vnp_TxnRef || "", "payment", `VNPay IPN: ${r.Message}`);
      // Chỉ bắn order.paid đúng 1 lần — khi đơn thật sự chuyển sang paid.
      if (query.vnp_ResponseCode === "00" && firstPaid) {
        const { dispatchWebhooks } = await import("@/server/webhooks");
        await dispatchWebhooks("order.paid", { code: query.vnp_TxnRef, gateway: "vnpay" });
      }
    }
    return r;
  });
  return NextResponse.json(result);
}
