import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createOrder, getProductById } from "./commerce";
import { defaultWarehouse, setWarehouseStock } from "./warehouse";
import { requestReturn, resolveReturn } from "./returns";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

describe("returns", () => {
  it("sai email / quá số lượng bị chặn; duyệt hoàn tồn", async () => {
    const before = await getProductById("p3");
    await prisma.product.update({ where: { id: "p3" }, data: { stock: 20 } });
    const wh = await defaultWarehouse();
    if (wh) await setWarehouseStock(wh.id, "p3", "", 20);
    const email = `r${uid()}@kit.vn`.replace(/-/g, "");
    const order = await createOrder({
      customer: "Tra Hang",
      email,
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
      items: [
        {
          productId: "p3",
          slug: before!.slug,
          name: before!.name,
          image: before!.images[0] || "",
          price: before!.price,
          quantity: 2,
          variantLabel: "",
        },
      ],
    });
    const mid = await getProductById("p3");
    expect(mid!.stock).toBe(18);

    await expect(requestReturn(order.code, "sai@kit.vn", [], "hong")).rejects.toThrow(/email/i);
    await expect(
      requestReturn(order.code, email, [{ productId: "p3", quantity: 5 }], "doi y"),
    ).rejects.toThrow(/Số lượng/);

    const req = await requestReturn(order.code, email, [{ productId: "p3", quantity: 2 }], "doi y");
    expect(req.status).toBe("pending");
    const done = await resolveReturn(req.id, true);
    expect(done.status).toBe("completed");
    const after = await getProductById("p3");
    expect(after!.stock).toBe(20);
    await expect(resolveReturn(req.id, true)).rejects.toThrow(/chờ/);

    // Dọn
    await prisma.returnRequest.delete({ where: { id: req.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.stockMovement.deleteMany({ where: { ref: order.code } });
    await prisma.stockMovement.deleteMany({ where: { reason: "return" } });
    await prisma.order.delete({ where: { id: order.id } });
  });
});
