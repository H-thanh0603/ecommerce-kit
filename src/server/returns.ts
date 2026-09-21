import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export type ReturnItem = { productId: string; skuId?: string; variantLabel?: string; quantity: number };

function parseItems(raw: string): ReturnItem[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Khách tạo yêu cầu trả hàng — chỉ nhận item thuộc đơn và email khớp. */
export async function requestReturn(orderCode: string, email: string, items: ReturnItem[], reason: string) {
  const order = await prisma.order.findUnique({ where: { code: orderCode.trim() }, include: { items: true } });
  if (!order || order.email.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error("Không tìm thấy đơn với email này");
  }
  if (order.status === "cancelled") throw new Error("Đơn đã hủy");
  if (!items.length) throw new Error("Chọn sản phẩm cần trả");
  if (!reason.trim()) throw new Error("Nhập lý do trả hàng");
  for (const it of items) {
    const line = order.items.find(
      (o) => o.productId === it.productId && (o.skuId || "") === (it.skuId || ""),
    );
    if (!line || it.quantity <= 0 || it.quantity > line.quantity) {
      throw new Error("Số lượng trả không hợp lệ");
    }
  }
  return prisma.returnRequest.create({
    data: {
      orderId: order.id,
      itemsJson: JSON.stringify(items),
      reason: reason.trim().slice(0, 500),
    },
  });
}

export async function listReturns(status?: string) {
  return prisma.returnRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { order: { select: { code: true, customer: true, email: true } } },
  });
}

async function restockTx(tx: Prisma.TransactionClient, orderId: string, items: ReturnItem[], ref: string) {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  for (const it of items) {
    if (it.skuId) {
      await tx.sku.update({ where: { id: it.skuId }, data: { stock: { increment: it.quantity } } });
    } else {
      await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
    }
    await tx.product.update({ where: { id: it.productId }, data: { sold: { decrement: it.quantity } } });
    await tx.stockMovement.create({
      data: { productId: it.productId, skuId: it.skuId, delta: it.quantity, reason: "return", ref },
    });
    if (order?.warehouseId) {
      const skuRow = it.skuId ? await tx.sku.findUnique({ where: { id: it.skuId } }) : null;
      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId_skuKey: {
            warehouseId: order.warehouseId,
            productId: it.productId,
            skuKey: skuRow?.label || it.variantLabel || "",
          },
        },
        create: {
          warehouseId: order.warehouseId,
          productId: it.productId,
          skuKey: skuRow?.label || it.variantLabel || "",
          stock: it.quantity,
        },
        update: { stock: { increment: it.quantity } },
      });
    }
  }
}

/** Duyệt = hoàn tồn + sold; từ chối = đóng yêu cầu. */
export async function resolveReturn(id: string, approve: boolean) {
  const req = await prisma.returnRequest.findUnique({ where: { id } });
  if (!req || req.status !== "pending") throw new Error("Yêu cầu không ở trạng thái chờ");
  if (!approve) {
    return prisma.returnRequest.update({ where: { id }, data: { status: "rejected" } });
  }
  return prisma.$transaction(async (tx) => {
    await restockTx(tx, req.orderId, parseItems(req.itemsJson), `RET-${req.id.slice(-6)}`);
    return tx.returnRequest.update({ where: { id }, data: { status: "completed" } });
  });
}
