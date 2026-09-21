import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export async function listWarehouses() {
  return prisma.warehouse.findMany({ orderBy: { name: "asc" }, include: { stocks: true } });
}

export async function defaultWarehouse() {
  return prisma.warehouse.findFirst({ where: { isDefault: true } }) || prisma.warehouse.findFirst();
}

export async function upsertWarehouse(data: { id?: string; code: string; name: string; address?: string; isDefault?: boolean }) {
  if (data.isDefault) {
    await prisma.warehouse.updateMany({ data: { isDefault: false } });
  }
  const payload = { code: data.code, name: data.name, address: data.address || "", isDefault: Boolean(data.isDefault) };
  return data.id
    ? prisma.warehouse.update({ where: { id: data.id }, data: payload })
    : prisma.warehouse.create({ data: payload });
}

export async function setWarehouseStock(warehouseId: string, productId: string, skuKey: string, stock: number) {
  return prisma.warehouseStock.upsert({
    where: { warehouseId_productId_skuKey: { warehouseId, productId, skuKey } },
    create: { warehouseId, productId, skuKey, stock },
    update: { stock },
  });
}

export async function decrementWarehouse(warehouseId: string, productId: string, skuKey: string, qty: number) {
  const updated = await prisma.warehouseStock.updateMany({
    where: { warehouseId, productId, skuKey, stock: { gte: qty } },
    data: { stock: { decrement: qty } },
  });
  return updated.count === 1;
}

export type WarehouseDecrement = "ok" | "insufficient" | "unmanaged";

/**
 * Trừ tồn kho trong transaction checkout.
 * - "unmanaged": kho chưa quản lý SP này (SP tạo tay, chưa đồng bộ) → bỏ qua, không chặn đơn.
 * - "insufficient": kho có quản lý nhưng không đủ → chặn đơn.
 */
export async function decrementWarehouseTx(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  productId: string,
  skuKey: string,
  qty: number,
): Promise<WarehouseDecrement> {
  const row = await tx.warehouseStock.findUnique({
    where: { warehouseId_productId_skuKey: { warehouseId, productId, skuKey } },
  });
  if (!row) return "unmanaged";
  if (row.stock < qty) return "insufficient";
  await tx.warehouseStock.update({
    where: { warehouseId_productId_skuKey: { warehouseId, productId, skuKey } },
    data: { stock: { decrement: qty } },
  });
  return "ok";
}

/** Tạo dòng tồn kho còn thiếu cho SP (gọi sau upsertProduct, không ghi đè số đã chỉnh tay). */
export async function ensureWarehouseStock(productId: string) {
  const warehouse = await defaultWarehouse();
  if (!warehouse) return;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { skus: true },
  });
  if (!product) return;
  const keys = product.skus.length ? product.skus.map((s) => ({ key: s.label, stock: s.stock })) : [{ key: "", stock: product.stock }];
  for (const k of keys) {
    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId_skuKey: { warehouseId: warehouse.id, productId, skuKey: k.key } },
      create: { warehouseId: warehouse.id, productId, skuKey: k.key, stock: k.stock },
      update: {},
    });
  }
}
