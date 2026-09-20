import { describe, expect, it } from "vitest";
import { createOrder, getProductById } from "./commerce";

describe("createOrder", () => {
  it("trừ tồn SKU, không tin giá client, mã ATL- tuần tự", async () => {
    const before = await getProductById("p1");
    expect(before).toBeTruthy();
    const sku = before!.skus?.[0];
    expect(sku).toBeTruthy();
    const stockBefore = sku!.stock;

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
});
