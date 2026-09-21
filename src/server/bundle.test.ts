import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createOrder, getProductById } from "./commerce";
import { defaultWarehouse, setWarehouseStock } from "./warehouse";
import { deleteBundle, quoteBundle, upsertBundle } from "./bundle";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function stockUp() {
  const p5 = await getProductById("p5");
  const p6 = await getProductById("p7");
  await prisma.product.update({ where: { id: "p5" }, data: { stock: 20 } });
  await prisma.product.update({ where: { id: "p7" }, data: { stock: 20 } });
  const wh = await defaultWarehouse();
  if (wh) {
    await setWarehouseStock(wh.id, "p5", "", 20);
    await setWarehouseStock(wh.id, "p7", "", 20);
  }
  return { p5: p5!, p6: p6! };
}

function itemOf(p: { id: string; slug: string; name: string; images: string[]; price: number }) {
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    image: p.images[0] || "",
    price: p.price,
    quantity: 1,
    variantLabel: "",
  };
}

describe("bundle", () => {
  it("giảm = giá lẻ − giá combo; thiếu dòng trong giỏ thì chặn", async () => {
    const { p5, p6 } = await stockUp();
    const b = await upsertBundle({
      name: `Combo ${uid()}`,
      lines: [
        { productId: "p5", quantity: 1 },
        { productId: "p7", quantity: 1 },
      ],
      price: p5.price + p6.price - 30_000,
    });
    const q = await quoteBundle(b.id, [
      { productId: "p5", price: p5.price, quantity: 1 },
      { productId: "p7", price: p6.price, quantity: 1 },
    ]);
    expect(q.discount).toBe(30_000);
    await expect(
      quoteBundle(b.id, [{ productId: "p5", price: p5.price, quantity: 1 }]),
    ).rejects.toThrow(/thiếu hàng/);

    const order = await createOrder({
      customer: "Combo",
      email: `b${uid()}@kit.vn`.replace(/-/g, ""),
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
      bundleId: b.id,
      items: [itemOf(p5), itemOf(p6)],
    });
    expect(order.discount).toBeGreaterThanOrEqual(30_000);
    expect(order.bundleCode).toBe(b.name);
    await deleteBundle(b.id);
  });

  it("combo tắt / SP ngừng bán bị chặn", async () => {
    const { p5 } = await stockUp();
    const b = await upsertBundle({
      name: `Off ${uid()}`,
      lines: [{ productId: "p5", quantity: 1 }],
      price: 1,
      active: false,
    });
    await expect(quoteBundle(b.id, [{ productId: "p5", price: p5.price, quantity: 1 }])).rejects.toThrow(/tắt/);
    await expect(
      upsertBundle({ name: "X", lines: [{ productId: "khong-co", quantity: 1 }], price: 1 }),
    ).rejects.toThrow(/không còn bán/);
    await deleteBundle(b.id);
  });
});
