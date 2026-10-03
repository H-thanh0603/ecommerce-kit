import { NextResponse } from "next/server";
import { extractVietqrOrderCode, handleVietqrIpn } from "@/server/vietqr";
import { logOrderEventByCode } from "@/server/order-events";
import { prisma } from "@/server/db";
import { resolveTenant, withDefaultTenant, wireTenantLookup } from "@/server/tenant";
import { runWithTenant } from "@/server/tenant-context";

/**
 * Webhook cổng trung gian (SePay/Casso…) gọi POST JSON về đây sau khi có tiền về.
 * Chữ ký: header `x-vietqr-signature` = HMAC-SHA256(raw body, VIETQR_WEBHOOK_SECRET).
 */
export async function POST(req: Request) {
  wireTenantLookup(); // idempotent — webhook không đi qua root layout
  const host = req.headers.get("host") || "";
  const tenant = host ? await resolveTenant(host).catch(() => null) : null;
  // Webhook không tin Host tuyệt đối: không resolve được → DEFAULT_TENANT (T5).
  const run = <T,>(fn: () => T) => (tenant ? runWithTenant(tenant.slug, fn) : withDefaultTenant(fn));
  const result = await run(async () => {
    const raw = await req.text();
    const r = await handleVietqrIpn(raw, req.headers.get("x-vietqr-signature") || "", {
      findOrder: async (code) =>
        prisma.order.findUnique({ where: { code }, select: { code: true, total: true, paymentStatus: true } }),
      // Ghi nhận paid trong 1 transaction — bảo đảm đơn chỉ chốt trạng thái một lần nguyên vẹn.
      markPaid: async (code, ref) => {
        await prisma.$transaction(async (tx) => {
          await tx.order.updateMany({
            where: { code, paymentStatus: { not: "paid" } },
            data: { paymentStatus: "paid", paymentRef: ref || undefined },
          });
        });
      },
    });
    if (r.ok && !r.alreadyPaid) {
      const body = JSON.parse(raw) as { content?: string; description?: string };
      const code = extractVietqrOrderCode(`${body.content || ""} ${body.description || ""}`);
      if (code) {
        await logOrderEventByCode(code, "payment", `VietQR IPN: ${r.message}`);
        const { dispatchWebhooks } = await import("@/server/webhooks");
        await dispatchWebhooks("order.paid", { code, gateway: "vietqr" });
      }
    }
    return r;
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
