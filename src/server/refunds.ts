import { prisma } from "@/server/db";

export const REFUND_METHODS = ["bank", "vnpay", "momo", "cash"] as const;

/** Sổ hoàn tiền — tổng đã hoàn 1 đơn không vượt tổng đơn. */
export async function refundedTotal(orderId: string) {
  const agg = await prisma.refund.aggregate({
    where: { orderId, status: { in: ["pending", "completed"] } },
    _sum: { amount: true },
  });
  return agg._sum.amount || 0;
}

export async function createRefund(orderCode: string, amount: number, method = "bank", note = "") {
  const order = await prisma.order.findUnique({ where: { code: orderCode.trim() } });
  if (!order) throw new Error("Không thấy đơn");
  const value = Math.round(amount);
  if (value <= 0) throw new Error("Số tiền hoàn phải > 0");
  if (!REFUND_METHODS.includes(method as (typeof REFUND_METHODS)[number])) {
    throw new Error("Phương thức hoàn không hỗ trợ");
  }
  const done = await refundedTotal(order.id);
  if (done + value > order.total) {
    throw new Error(`Vượt tổng đơn (đã hoàn ${done}/${order.total})`);
  }
  return prisma.refund.create({
    data: { orderId: order.id, amount: value, method, note: note.slice(0, 300) },
  });
}

export async function listRefunds(status?: string) {
  return prisma.refund.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { order: { select: { code: true, customer: true, paymentMethod: true, paymentRef: true } } },
  });
}

export async function setRefundStatus(id: string, status: "completed" | "failed") {
  const refund = await prisma.refund.findUnique({ where: { id } });
  if (!refund || refund.status !== "pending") throw new Error("Hoàn tiền không ở trạng thái chờ");
  return prisma.refund.update({ where: { id }, data: { status } });
}
