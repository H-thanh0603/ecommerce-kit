import { describe, expect, it, afterAll, afterEach, vi } from "vitest";
import { prisma } from "./db";
import { createOrder, getProductById, cancelStalePendingOrders } from "./commerce";
import { defaultWarehouse, setWarehouseStock } from "./warehouse";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.VNPAY_TMN_CODE;
  delete process.env.VNPAY_HASH_SECRET;
});

// p4 (không SKU) — riêng biệt với p1/p2/p3 của các file test checkout khác.
const PID = "p4";

async function restock(stock = 10) {
  const wh = await defaultWarehouse();
  if (wh) await setWarehouseStock(wh.id, PID, "", stock);
  await prisma.product.update({ where: { id: PID }, data: { stock } });
}

function checkoutItem(price: number, quantity: number) {
  return { productId: PID, slug: "den-ban-gom-su", name: "Đèn bàn gốm sứ", image: "", price, quantity };
}

async function cleanup(email: string) {
  const orders = await prisma.order.findMany({ where: { email }, select: { id: true, code: true } });
  for (const o of orders) {
    await prisma.stockMovement.deleteMany({ where: { OR: [{ ref: o.code }, { ref: `CAN-${o.code}` }] } });
    await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    await prisma.orderEvent.deleteMany({ where: { orderId: o.id } });
    await prisma.mailLog.deleteMany({ where: { to: email } });
    await prisma.order.deleteMany({ where: { id: o.id } });
  }
}

afterAll(async () => {
  await restock(12);
  const wh = await defaultWarehouse();
  if (wh) await setWarehouseStock(wh.id, PID, "", 12);
});

describe("cancelStalePendingOrders", () => {
  it("hủy đơn pending quá hạn + hoàn tồn; đơn mới và đơn paid giữ nguyên", async () => {
    await restock(10);

    // Đơn quá hạn (backdate createdAt bằng Prisma update — không raw SQL)
    const stale = await createOrder({
      customer: "Bỏ ngang",
      email: `stale-${Date.now()}@kit.vn`,
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
      items: [checkoutItem(780_000, 3)],
    });
    await prisma.order.update({
      where: { id: stale.id },
      data: { createdAt: new Date(Date.now() - 30 * 3600_000) },
    });

    // Đơn pending "đã paid" quá hạn (gateway ghi nhận, admin chưa confirm) → không được đụng
    process.env.VNPAY_TMN_CODE = "TEST";
    process.env.VNPAY_HASH_SECRET = "TESTSECRET";
    const paid = await createOrder({
      customer: "Đã trả",
      email: `paid-${Date.now()}@kit.vn`,
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "vnpay",
      items: [checkoutItem(780_000, 1)],
    });
    await prisma.order.update({
      where: { id: paid.id },
      data: { paymentStatus: "paid", createdAt: new Date(Date.now() - 48 * 3600_000) },
    });

    // Đơn pending mới → không đụng
    const fresh = await createOrder({
      customer: "Mới đặt",
      email: `fresh-${Date.now()}@kit.vn`,
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
      items: [checkoutItem(780_000, 1)],
    });

    const result = await cancelStalePendingOrders(24, { onlyIds: [stale.id, paid.id, fresh.id] });
    expect(result.checked).toBe(1); // chỉ đơn stale đủ điều kiện
    expect(result.cancelled).toBe(1);

    const staleAfter = await prisma.order.findUnique({ where: { id: stale.id } });
    expect(staleAfter!.status).toBe("cancelled");
    const paidAfter = await prisma.order.findUnique({ where: { id: paid.id } });
    expect(paidAfter!.status).toBe("pending");
    expect(paidAfter!.paymentStatus).toBe("paid");
    const freshAfter = await prisma.order.findUnique({ where: { id: fresh.id } });
    expect(freshAfter!.status).toBe("pending");

    // Tồn hoàn đúng 3 (đơn stale) — tồn trong lúc test = 10 - 3 - 1 - 1 + 3 = 8
    const p = await getProductById(PID);
    expect(p!.stock).toBe(8);

    // Ghi orderEvent với actor auto-expire
    const ev = await prisma.orderEvent.findFirst({
      where: { orderId: stale.id, kind: "status", actor: "auto-expire" },
    });
    expect(ev).toBeTruthy();

    // Chạy lần 2 — idempotent
    const again = await cancelStalePendingOrders(24, { onlyIds: [stale.id, paid.id, fresh.id] });
    const stockAgain = await getProductById(PID);
    expect(stockAgain!.stock).toBe(8);
    expect(again.cancelled).toBe(0);
  });
});
