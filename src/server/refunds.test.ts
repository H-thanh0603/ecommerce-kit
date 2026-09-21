import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createRefund, listRefunds, refundedTotal, setRefundStatus } from "./refunds";
import { buildMomoRefund } from "./momo";
import { buildVnpayRefund } from "./vnpay";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function seedOrder(total = 500_000) {
  const seq = Date.now() % 1_000_000_000;
  return prisma.order.create({
    data: {
      code: `RF-T${seq}`,
      seq,
      customer: "Hoan Tien",
      email: `rf${seq}@kit.vn`,
      phone: "0900000000",
      address: "1 Test",
      subtotal: total,
      shippingFee: 0,
      discount: 0,
      total,
      paymentMethod: "bankTransfer",
      items: {
        create: [{ productId: "p5", slug: "s", name: "SP", image: "", price: total, quantity: 1 }],
      },
    },
  });
}

describe("refund ledger", () => {
  it("chặn vượt tổng đơn; cộng dồn nhiều lần; đóng phiếu", async () => {
    const order = await seedOrder();
    await expect(createRefund(order.code, 0)).rejects.toThrow(/> 0/);
    await expect(createRefund(order.code, 600_000)).rejects.toThrow(/Vượt tổng/);
    const r1 = await createRefund(order.code, 200_000, "bank", "lan 1");
    expect(r1.status).toBe("pending");
    expect(await refundedTotal(order.id)).toBe(200_000);
    const r2 = await createRefund(order.code, 300_000);
    expect(await refundedTotal(order.id)).toBe(500_000);
    await expect(createRefund(order.code, 1)).rejects.toThrow(/Vượt tổng/);
    expect((await setRefundStatus(r1.id, "completed")).status).toBe("completed");
    expect((await listRefunds("completed")).some((r) => r.id === r1.id)).toBe(true);
    await prisma.refund.deleteMany({ where: { orderId: order.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
    void r2;
    void uid;
  });
});

describe("gateway refund builders", () => {
  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = "TMN";
    process.env.VNPAY_HASH_SECRET = "SEC";
    process.env.MOMO_PARTNER_CODE = "PM";
    process.env.MOMO_ACCESS_KEY = "AK";
    process.env.MOMO_SECRET_KEY = "SK";
  });

  it("vnpay: đủ 13 field ký pipe, hash 128 ký tự", () => {
    const b = buildVnpayRefund({
      txnRef: "ATL-00001",
      amount: 100_000,
      transactionNo: "999",
      transactionDate: "20260101000000",
      createdBy: "admin",
    });
    expect(b.vnp_Command).toBe("refund");
    expect(b.vnp_TransactionType).toBe("02");
    expect(b.vnp_Amount).toBe("10000000");
    expect(b.vnp_SecureHash).toMatch(/^[0-9a-f]{128}$/);
    expect(buildVnpayRefund({ txnRef: "ATL-00001", amount: 50_000, transactionNo: "999", transactionDate: "20260101000000", createdBy: "admin", full: false }).vnp_TransactionType).toBe("03");
  });

  it("momo: chữ ký đúng format", () => {
    const b = buildMomoRefund({ orderId: "ATL-00001", amount: 100_000, transId: "111" });
    expect(b.signature).toMatch(/^[0-9a-f]{64}$/);
    expect(b.amount).toBe("100000");
  });
});
