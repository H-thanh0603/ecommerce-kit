import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createOrder, getProductById } from "./commerce";

describe("createOrder", () => {
  it("trừ tồn SKU, không tin giá client, mã ATL- tuần tự", async () => {
    const before = await getProductById("p1");
    expect(before).toBeTruthy();
    const sku = before!.skus?.find((s) => s.stock > 0) ?? before!.skus?.[0];
    expect(sku).toBeTruthy();
    // Nạp lại tồn để test chạy lặp (idempotent), không phụ thuộc số lần chạy trước.
    await prisma.sku.update({ where: { id: sku!.id }, data: { stock: 5 } });
    const stockBefore = 5;

    const order = await createOrder({
      customer: "Tester",
      email: `t${Date.now()}@kit.vn`,
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
      items: [
        {
          productId: "p1",
          slug: before!.slug,
          name: before!.name,
          image: before!.images[0] || "",
          price: 1,
          quantity: 1,
          skuId: sku!.id,
          variantLabel: sku!.label,
        },
      ],
    });

    expect(order.code).toMatch(/^ATL-\d{5}$/);
    expect(order.items[0].price).toBe(before!.price);
    expect(order.total).toBeGreaterThan(0);

    const after = await getProductById("p1");
    const skuAfter = after!.skus?.find((s) => s.id === sku!.id);
    expect(skuAfter!.stock).toBe(stockBefore - 1);
  });

  it("không bán quá tồn: hết hàng thì đơn sau bị từ chối, tồn không âm", async () => {
    const before = await getProductById("p1");
    const sku = before!.skus?.find((s) => s.stock > 0) ?? before!.skus?.[0];
    await prisma.sku.update({ where: { id: sku!.id }, data: { stock: 1 } });
    const item = (price: number) => ({
      productId: "p1",
      slug: before!.slug,
      name: before!.name,
      image: before!.images[0] || "",
      price,
      quantity: 1,
      skuId: sku!.id,
      variantLabel: sku!.label,
    });
    const ok = await createOrder({
      customer: "Mua 1",
      email: `s1-${Date.now()}@kit.vn`,
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
      items: [item(before!.price)],
    });
    expect(ok.code).toMatch(/^ATL-\d{5}$/);
    await expect(
      createOrder({
        customer: "Mua 2",
        email: `s2-${Date.now()}@kit.vn`,
        phone: "0900000000",
        address: "1 Test, Q1",
        paymentMethod: "cod",
        items: [item(before!.price)],
      }),
    ).rejects.toThrow(/Không đủ tồn/);
    const after = await getProductById("p1");
    expect(after!.skus?.find((s) => s.id === sku!.id)!.stock).toBe(0);
  });

  it("trừ tồn kho mặc định theo đơn; kho hết thì chặn dù tồn chung còn", async () => {
    const { defaultWarehouse, setWarehouseStock } = await import("./warehouse");
    const before = await getProductById("p1");
    const sku = before!.skus?.find((s) => s.stock > 0) ?? before!.skus?.[0];
    const wh = await defaultWarehouse();
    expect(wh).toBeTruthy();
    await prisma.sku.update({ where: { id: sku!.id }, data: { stock: 10 } });
    await setWarehouseStock(wh!.id, "p1", sku!.label, 1);
    const item = {
      productId: "p1",
      slug: before!.slug,
      name: before!.name,
      image: before!.images[0] || "",
      price: before!.price,
      quantity: 1,
      skuId: sku!.id,
      variantLabel: sku!.label,
    };
    const base = {
      customer: "Kho",
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
    };
    await createOrder({ ...base, email: `w1-${Date.now()}@kit.vn`, items: [item] });
    await expect(
      createOrder({ ...base, email: `w2-${Date.now()}@kit.vn`, items: [item] }),
    ).rejects.toThrow(/kho/);
    const left = await prisma.warehouseStock.findUnique({
      where: { warehouseId_productId_skuKey: { warehouseId: wh!.id, productId: "p1", skuKey: sku!.label } },
    });
    expect(left!.stock).toBe(0);
  });
});
