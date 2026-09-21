import { NextResponse } from "next/server";
import { handleSepayWebhook } from "@/server/sepay";
import { logOrderEventByCode } from "@/server/order-events";
import { prisma } from "@/server/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await handleSepayWebhook(
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
  if (result.ok && result.message.startsWith("Đã gạch")) {
    const { extractOrderCode } = await import("@/server/sepay");
    const code = extractOrderCode(`${body.content || ""} ${body.code || ""}`);
    if (code) {
      await logOrderEventByCode(code, "payment", `SePay: ${result.message}`);
      const { dispatchWebhooks } = await import("@/server/webhooks");
      await dispatchWebhooks("order.paid", { code, gateway: "sepay" });
    }
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
