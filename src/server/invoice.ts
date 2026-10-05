import { prisma } from "@/server/db";
import { toOrder } from "@/server/map";
import { Prisma } from "@prisma/client";

export async function issueInvoice(orderId: string, buyerTax = "", opts?: { buyerAddress?: string; taxRate?: number }) {
  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing) return existing;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Không thấy đơn");
  const taxRate = Math.min(100, Math.max(0, opts?.taxRate ?? 10));
  // Giá đã gồm VAT → tách VAT: vat = total * rate / (100 + rate)
  const vatAmount = Math.round((order.total * taxRate) / (100 + taxRate));
  try {
    // Cả counter lẫn create phải cùng transaction: nếu tách, create lỗi giữa chừng
    // làm mất số INV (nhảy số). 2 request song song cùng đơn → 1 cái P2002 ở
    // Invoice.orderId unique → bắt và trả existing (idempotent).
    return await prisma.$transaction(async (tx) => {
      const counter = await tx.orderCounter.upsert({
        where: { id: "invoice" },
        create: { id: "invoice", value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = `INV-${String(counter.value).padStart(5, "0")}`;
      return tx.invoice.create({
        data: {
          orderId,
          number,
          buyerName: order.customer,
          buyerTax,
          buyerAddress: opts?.buyerAddress || order.address,
          taxRate,
          vatAmount,
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const dup = await prisma.invoice.findUnique({ where: { orderId } });
      if (dup) return dup;
    }
    throw e;
  }
}

export async function getInvoiceByOrder(orderId: string) {
  return prisma.invoice.findUnique({ where: { orderId } });
}

export async function getInvoiceByNumber(number: string) {
  const inv = await prisma.invoice.findUnique({ where: { number }, include: { order: { include: { items: true } } } });
  if (!inv) return null;
  return { invoice: inv, order: toOrder(inv.order) };
}

/** Chống IDOR: chỉ admin hoặc chủ đơn (đúng email) xem được hóa đơn. */
export function canViewInvoice(
  session: { email: string; role: string } | null | undefined,
  orderEmail: string,
): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return session.email.toLowerCase() === orderEmail.toLowerCase();
}

export async function listInvoices() {
  return prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, include: { order: true } });
}
