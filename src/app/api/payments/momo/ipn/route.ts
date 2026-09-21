import { NextResponse } from "next/server";
import { handleMomoIpn } from "@/server/momo";
import { logOrderEventByCode } from "@/server/order-events";
import { prisma } from "@/server/db";

/** MoMo gọi POST JSON về đây sau khi khách trả. */
export async function POST(req: Request) {
  const data = await req.json().catch(() => ({}));
  const result = await handleMomoIpn(data, {
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
  if (result.ok) {
    await logOrderEventByCode(String(data.orderId || ""), "payment", `MoMo IPN: ${result.message}`);
    if (Number(data.resultCode) === 0) {
      const { dispatchWebhooks } = await import("@/server/webhooks");
      await dispatchWebhooks("order.paid", { code: String(data.orderId || ""), gateway: "momo" });
    }
  }
  return NextResponse.json(result);
}
