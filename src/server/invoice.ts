import { prisma } from "@/server/db";
import { toOrder } from "@/server/map";

export async function issueInvoice(orderId: string, buyerTax = "") {
  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing) return existing;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Không thấy đơn");
  const counter = await prisma.orderCounter.upsert({
    where: { id: "invoice" },
    create: { id: "invoice", value: 1 },
    update: { value: { increment: 1 } },
  });
  const number = `INV-${String(counter.value).padStart(5, "0")}`;
  return prisma.invoice.create({
    data: {
      orderId,
      number,
      buyerName: order.customer,
      buyerTax,
    },
  });
}

export async function getInvoiceByOrder(orderId: string) {
  return prisma.invoice.findUnique({ where: { orderId } });
}

export async function getInvoiceByNumber(number: string) {
  const inv = await prisma.invoice.findUnique({ where: { number }, include: { order: { include: { items: true } } } });
  if (!inv) return null;
  return { invoice: inv, order: toOrder(inv.order) };
}

export async function listInvoices() {
  return prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, include: { order: true } });
}
