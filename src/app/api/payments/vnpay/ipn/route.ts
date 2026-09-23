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
    const r = await handleVnpayIpn(query, {
      findOrder: async (code) =>
        prisma.order.findUnique({ where: { code }, select: { code: true, total: true, paymentStatus: true } }),
      markPaid: async (code) => {
        await prisma.order.updateMany({
          where: { code },
          data: { paymentStatus: "paid", paymentRef: query.vnp_TransactionNo || "" },
        });
      },
      markFailed: async (code) => {
        await prisma.order.updateMany({ where: { code }, data: { paymentStatus: "failed" } });
      },
    });
    if (r.RspCode === "00") {
      await logOrderEventByCode(query.vnp_TxnRef || "", "payment", `VNPay IPN: ${r.Message}`);
      if (query.vnp_ResponseCode === "00") {
        const { dispatchWebhooks } = await import("@/server/webhooks");
        await dispatchWebhooks("order.paid", { code: query.vnp_TxnRef, gateway: "vnpay" });
      }
    }
    return r;
  });
  return NextResponse.json(result);
}
