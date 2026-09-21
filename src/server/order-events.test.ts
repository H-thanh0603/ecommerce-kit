import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createOrder, getProductById, updateOrderStatus } from "./commerce";
import { defaultWarehouse, setWarehouseStock } from "./warehouse";
import { getOrderTimeline } from "./order-events";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

describe("order timeline", () => {
  it("ghi created + status change", async () => {
    const before = await getProductById("p4");
    await prisma.product.update({ where: { id: "p4" }, data: { stock: 10 } });
    const wh = await defaultWarehouse();
    if (wh) await setWarehouseStock(wh.id, "p4", "", 10);
    const order = await createOrder({
      customer: "Timeline",
      email: `tl${uid()}@kit.vn`.replace(/-/g, ""),
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
      items: [
        {
          productId: "p4",
          slug: before!.slug,
          name: before!.name,
          image: before!.images[0] || "",
          price: before!.price,
          quantity: 1,
          variantLabel: "",
        },
      ],
    });
    await updateOrderStatus((await prisma.order.findUnique({ where: { code: order.code } }))!.id, "confirmed");
    const row = await prisma.order.findUnique({ where: { code: order.code } });
    const events = await getOrderTimeline(row!.id);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("created");
    expect(kinds).toContain("status");
    // Dọn
    await prisma.orderEvent.deleteMany({ where: { orderId: row!.id } });
  });
});
