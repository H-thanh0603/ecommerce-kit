import { prisma } from "@/server/db";

export type OrderEventKind = "created" | "status" | "payment" | "shipping" | "note";

/** Ghi nhật ký đơn — best-effort, không bao giờ làm vỡ luồng chính. */
export async function logOrderEvent(orderId: string, kind: OrderEventKind, message: string) {
  try {
    await prisma.orderEvent.create({ data: { orderId, kind, message: message.slice(0, 500) } });
  } catch {
    /* bỏ qua */
  }
}

export async function logOrderEventByCode(code: string, kind: OrderEventKind, message: string) {
  try {
    const order = await prisma.order.findUnique({ where: { code }, select: { id: true } });
    if (order) await logOrderEvent(order.id, kind, message);
  } catch {
    /* bỏ qua */
  }
}

export async function getOrderTimeline(orderId: string) {
  return prisma.orderEvent.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
}
