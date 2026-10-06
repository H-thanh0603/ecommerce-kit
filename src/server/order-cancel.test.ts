import { describe, expect, it, afterAll } from "vitest";
import { prisma } from "./db";
import { createOrder, getProductById, updateOrderStatus } from "./commerce";
import { defaultWarehouse, setWarehouseStock } from "./warehouse";
import { upsertCoupon } from "./coupon";
import { upsertGift } from "./giftcard";

// Dùng p3 (không SKU — tồn cấp product) để không giành tồn với p1 (commerce-order) / p2 (giftcard).
const PID = "p3";

async function restock(stock = 10) {
  const wh = await defaultWarehouse();
  if (wh) await setWarehouseStock(wh.id, PID, "", stock);
  await prisma.product.update({ where: { id: PID }, data: { stock } });
}

function checkoutItem(name: string, price: number, quantity: number) {
  return { productId: PID, slug: `tui-canvas-thu-cong`, name, image: "", price, quantity };
}

const baseOrder = (email: string) => ({
  customer: "Tester Huy",
  email,
  phone: "0900000000",
  address: "1 Test, Q1",
  paymentMethod: "cod",
  items: [checkoutItem("Túi canvas", 320_000, 2)],
});

async function cleanup(email: string) {
  const orders = await prisma.order.findMany({ where: { email }, select: { id: true, code: true } });
  for (const o of orders) {
    await prisma.stockMovement.deleteMany({ where: { OR: [{ ref: o.code }, { ref: `CAN-${o.code}` }] } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.couponRedemption.deleteMany({ where: { orderId: o.id } });
    await prisma.giftRedemption.deleteMany({ where: { orderId: o.id } });
    await prisma.orderEvent.deleteMany({ where: { orderId: o.id } });
    await prisma.order.deleteMany({ where: { id: o.id } });
  }
  await prisma.user.deleteMany({ where: { email } });
  await prisma.mailLog.deleteMany({ where: { to: email } });
}

afterAll(async () => {
  await restock(56);
  const wh = await defaultWarehouse();
  if (wh) await setWarehouseStock(wh.id, PID, "", 56);
});

describe("order state machine", () => {
  it("pending → completed bị chặn (phải đi qua shipping)", async () => {
    await restock(10);
    const email = `sm1-${Date.now()}@kit.vn`;
    try {
      const order = await createOrder(baseOrder(email));
      await expect(updateOrderStatus(order.id, "completed")).rejects.toThrow(/Không thể chuyển/);
      // Đơn giữ nguyên trạng thái sau khi bị chặn
      expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe("pending");
    } finally {
      await cleanup(email);
    }
  });

  it("completed là trạng thái kết thúc — không hủy trực tiếp (phải qua trả hàng/hoàn tiền)", async () => {
    await restock(10);
    const email = `sm2-${Date.now()}@kit.vn`;
    try {
      const order = await createOrder(baseOrder(email));
      await prisma.order.update({ where: { id: order.id }, data: { status: "shipping" } });
      await updateOrderStatus(order.id, "completed");
      await expect(updateOrderStatus(order.id, "cancelled")).rejects.toThrow(/Không thể chuyển/);
    } finally {
      await cleanup(email);
    }
  });

  it("cancelled là trạng thái kết thúc — không chuyển lại được", async () => {
    await restock(10);
    const email = `sm3-${Date.now()}@kit.vn`;
    try {
      const order = await createOrder(baseOrder(email));
      await updateOrderStatus(order.id, "cancelled");
      await expect(updateOrderStatus(order.id, "pending")).rejects.toThrow(/Không thể chuyển/);
    } finally {
      await cleanup(email);
    }
  });
});

describe("updateOrderStatus → cancelled", () => {
  it("hoàn tồn + sold, ghi stockMovement 'cancel', hủy lần 2 không hoàn thêm", async () => {
    await restock(10);
    const email = `cancel1-${Date.now()}@kit.vn`;
    try {
      const order = await createOrder(baseOrder(email));
      const afterBuy = await getProductById(PID);
      expect(afterBuy!.stock).toBe(8);
      const soldAfterBuy = afterBuy!.sold;
      expect(soldAfterBuy).toBeGreaterThan(0);

      const cancelled = await updateOrderStatus(order.id, "cancelled");
      expect(cancelled.status).toBe("cancelled");

      const after = await getProductById(PID);
      expect(after!.stock).toBe(10);
      // sold bị trừ khi tạo đơn → hủy phải đưa về đúng trước đó
      expect(after!.sold).toBe(soldAfterBuy - 2);

      const moves = await prisma.stockMovement.findMany({ where: { ref: `CAN-${order.code}` } });
      expect(moves).toHaveLength(1);
      expect(moves[0]).toMatchObject({ productId: PID, delta: 2, reason: "cancel" });

      // Idempotent: hủy lại → tồn không tăng thêm
      await updateOrderStatus(order.id, "cancelled");
      const again = await getProductById(PID);
      expect(again!.stock).toBe(10);
      expect(await prisma.stockMovement.count({ where: { ref: `CAN-${order.code}` } })).toBe(1);
    } finally {
      await cleanup(email);
    }
  });

  it("hoàn tồn kho mặc định theo đơn hủy", async () => {
    await restock(10);
    const wh = await defaultWarehouse();
    expect(wh).toBeTruthy();
    const email = `cancel2-${Date.now()}@kit.vn`;
    try {
      const order = await createOrder(baseOrder(email));
      const whAfterBuy = await prisma.warehouseStock.findUnique({
        where: { warehouseId_productId_skuKey: { warehouseId: wh!.id, productId: PID, skuKey: "" } },
      });
      expect(whAfterBuy!.stock).toBe(8);

      await updateOrderStatus(order.id, "cancelled");
      const whAfter = await prisma.warehouseStock.findUnique({
        where: { warehouseId_productId_skuKey: { warehouseId: wh!.id, productId: PID, skuKey: "" } },
      });
      expect(whAfter!.stock).toBe(10);
    } finally {
      await cleanup(email);
    }
  });

  it("hủy đơn dùng coupon + điểm + giftcard → thu hồi đủ: điểm về, thẻ về, lượt mã mở lại", async () => {
    await restock(10);
    const email = `cancel3-${Date.now()}@kit.vn`;
    const user = await prisma.user.create({
      data: { name: "Có điểm", email, passwordHash: "x", points: 1000 },
    });
    const coupon = await upsertCoupon({ code: `CXL${Date.now()}`, type: "percent", value: 10, minOrder: 0, maxUses: 1 });
    const gift = await upsertGift({ code: `GXL${Date.now()}`, balance: 200_000 });
    try {
      const order = await createOrder({
        ...baseOrder(email),
        userId: user.id,
        couponCode: coupon.code,
        giftCode: gift.code,
        pointsToUse: 500,
      });
      // đơn đã tiêu tài nguyên
      expect(order.pointsUsed).toBe(500);
      const spent = await prisma.user.findUnique({ where: { id: user.id } });
      expect(spent!.points).toBe(500);
      const giftAfterBuy = await prisma.giftCard.findUnique({ where: { id: gift.id } });
      expect(giftAfterBuy!.balance).toBeLessThan(200_000);
      expect(
        await prisma.couponRedemption.count({ where: { couponId: coupon.id, orderId: order.id } }),
      ).toBe(1);

      // maxUses=1 đã chặn người dùng khác → sau hủy phải dùng được lại
      await updateOrderStatus(order.id, "cancelled");
      expect(await prisma.couponRedemption.count({ where: { couponId: coupon.id } })).toBe(0);
      expect(await prisma.giftRedemption.count({ where: { orderId: order.id } })).toBe(0);
      const giftAfter = await prisma.giftCard.findUnique({ where: { id: gift.id } });
      expect(giftAfter!.balance).toBe(200_000);
      const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
      expect(userAfter!.points).toBe(1000);
    } finally {
      await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
      await prisma.giftRedemption.deleteMany({ where: { giftId: gift.id } });
      await prisma.coupon.delete({ where: { id: coupon.id } });
      await prisma.giftCard.delete({ where: { id: gift.id } });
      await cleanup(email);
    }
  });
});
