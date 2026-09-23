import { NextResponse } from "next/server";
import { handleSepayWebhook } from "@/server/sepay";
import { logOrderEventByCode } from "@/server/order-events";
import { prisma } from "@/server/db";
import { resolveTenant, withDefaultTenant, wireTenantLookup } from "@/server/tenant";
import { runWithTenant } from "@/server/tenant-context";

export async function POST(req: Request) {
  wireTenantLookup(); // idempotent — webhook không đi qua root layout
  const host = req.headers.get("host") || "";
  const tenant = host ? await resolveTenant(host).catch(() => null) : null;
  // Webhook không tin Host tuyệt đối: không resolve được → DEFAULT_TENANT (T5).
  const run = <T,>(fn: () => T) => (tenant ? runWithTenant(tenant.slug, fn) : withDefaultTenant(fn));
  const result = await run(async () => {
    const body = await req.json().catch(() => ({}));
    const r = await handleSepayWebhook(
      { authorization: req.headers.get("authorization") || "" },
      body,
      {
        findOrder: async (code) =>
          prisma.order.findUnique({
            where: { code },
            select: { code: true, total: true, paymentStatus: true, paymentMethod: true },
          }),
        markPaid: async (code) => {
          await prisma.order.updateMany({ where: { code }, data: { paymentStatus: "paid" } });
        },
      },
    );
    if (r.ok && r.message.startsWith("Đã gạch")) {
      const { extractOrderCode } = await import("@/server/sepay");
      const code = extractOrderCode(`${body.content || ""} ${body.code || ""}`);
      if (code) {
        await logOrderEventByCode(code, "payment", `SePay: ${r.message}`);
        const { dispatchWebhooks } = await import("@/server/webhooks");
        await dispatchWebhooks("order.paid", { code, gateway: "sepay" });
      }
    }
    return r;
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
