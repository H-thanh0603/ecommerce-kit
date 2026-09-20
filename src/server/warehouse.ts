import { prisma } from "@/server/db";

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
