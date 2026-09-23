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
  // Check + ghi trong CÙNG transaction; re-check sau insert để chặn đua song song.
  return prisma.$transaction(async (tx) => {
    const before = await tx.refund.aggregate({
      where: { orderId: order.id, status: { in: ["pending", "completed"] } },
      _sum: { amount: true },
    });
    if ((before._sum.amount || 0) + value > order.total) {
      throw new Error(`Vượt tổng đơn (đã hoàn ${before._sum.amount || 0}/${order.total})`);
    }
    const created = await tx.refund.create({
      data: { orderId: order.id, amount: value, method, note: note.slice(0, 300) },
    });
    const after = await tx.refund.aggregate({
      where: { orderId: order.id, status: { in: ["pending", "completed"] } },
      _sum: { amount: true },
    });
    if ((after._sum.amount || 0) > order.total) {
      throw new Error(`Vượt tổng đơn (đã hoàn ${after._sum.amount || 0}/${order.total})`);
    }
    return created;
  });
}

export async function listRefunds(status?: string) {
  return prisma.refund.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { order: { select: { code: true, customer: true, paymentMethod: true, paymentRef: true } } },
  });
}

/**
 * Gọi cổng hoàn tiền thật (VNPay / MoMo) — cần Order.paymentRef đã lưu
 * vnp_TransactionNo / transId lúc IPN thành công.
 */
export async function executeGatewayRefund(
  order: {
    code: string;
    total: number;
    paymentRef: string;
    createdAt: Date;
  },
  amount: number,
  method: "vnpay" | "momo",
  createdBy: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    if (method === "momo") {
      if (!order.paymentRef) {
        return { ok: false, message: "Đơn thiếu transId (paymentRef) của MoMo" };
      }
      const { refundMomo } = await import("@/server/momo");
      return await refundMomo({ orderId: order.code, amount, transId: order.paymentRef });
    }
    if (!order.paymentRef) {
      return { ok: false, message: "Đơn thiếu vnp_TransactionNo (paymentRef) của VNPay" };
    }
    const { refundVnpay } = await import("@/server/vnpay");
    const d = order.createdAt;
    const pad = (n: number) => String(n).padStart(2, "0");
    const transactionDate =
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
      `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const alreadyAgg = await prisma.refund.aggregate({
      where: { order: { code: order.code }, status: { in: ["pending", "completed"] } },
      _sum: { amount: true },
    });
    // full = hoàn toàn giao dịch gốc; đã có refund trước thì chỉ partial.
    const full = amount + (alreadyAgg._sum.amount || 0) >= order.total;
    return await refundVnpay({
      txnRef: order.code,
      amount,
      transactionNo: order.paymentRef,
      transactionDate,
      createdBy,
      full,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lỗi gọi cổng hoàn tiền" };
  }
}

export async function setRefundStatus(id: string, status: "completed" | "failed") {
  const refund = await prisma.refund.findUnique({ where: { id } });
  if (!refund || refund.status !== "pending") throw new Error("Hoàn tiền không ở trạng thái chờ");
  return prisma.refund.update({ where: { id }, data: { status } });
}
