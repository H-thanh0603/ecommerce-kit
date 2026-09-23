import { NextResponse } from "next/server";
import { handleMomoIpn } from "@/server/momo";
import { logOrderEventByCode } from "@/server/order-events";
import { prisma } from "@/server/db";
import { resolveTenant, withDefaultTenant, wireTenantLookup } from "@/server/tenant";
import { runWithTenant } from "@/server/tenant-context";

/** MoMo gọi POST JSON về đây sau khi khách trả. */
export async function POST(req: Request) {
  wireTenantLookup(); // idempotent — IPN không đi qua root layout
  const host = req.headers.get("host") || "";
  const tenant = host ? await resolveTenant(host).catch(() => null) : null;
  // IPN không tin Host tuyệt đối: không resolve được → DEFAULT_TENANT (T5).
  const run = <T,>(fn: () => T) => (tenant ? runWithTenant(tenant.slug, fn) : withDefaultTenant(fn));
  const result = await run(async () => {
    const data = await req.json().catch(() => ({}));
    const r = await handleMomoIpn(data, {
      findOrder: async (code) =>
        prisma.order.findUnique({ where: { code }, select: { code: true, total: true, paymentStatus: true } }),
      markPaid: async (code, transId) => {
        await prisma.order.updateMany({
          where: { code },
          data: { paymentStatus: "paid", paymentRef: transId || String(data.transId || "") },
        });
      },
      markFailed: async (code) => {
        await prisma.order.updateMany({ where: { code }, data: { paymentStatus: "failed" } });
      },
    });
    if (r.ok && !r.alreadyPaid) {
      await logOrderEventByCode(String(data.orderId || ""), "payment", `MoMo IPN: ${r.message}`);
      if (Number(data.resultCode) === 0) {
        const { dispatchWebhooks } = await import("@/server/webhooks");
        await dispatchWebhooks("order.paid", { code: String(data.orderId || ""), gateway: "momo" });
      }
    }
    return r;
  });
  return NextResponse.json(result);
}
