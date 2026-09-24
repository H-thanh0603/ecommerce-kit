import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { canViewInvoice, issueInvoice } from "./invoice";

/** Tạo đơn tối giản để xuất hóa đơn (không qua checkout). */
async function seedOrder() {
  const seq = Date.now() % 1_000_000_000;
  return prisma.order.create({
    data: {
      code: `INV-T${seq}`,
      seq,
      customer: "Cty Test",
      email: `inv${seq}@kit.vn`,
      phone: "0900000000",
      address: "1 Test",
      subtotal: 1_100_000,
      shippingFee: 0,
      discount: 0,
      total: 1_100_000,
      paymentMethod: "bankTransfer",
      items: {
        create: [
          { productId: "p8", slug: "s", name: "SP", image: "", price: 1_100_000, quantity: 1 },
        ],
      },
    },
  });
}

describe("invoice VAT", () => {
  it("tách VAT 10% từ giá gồm thuế, idempotent", async () => {
    const order = await seedOrder();
    const inv = await issueInvoice(order.id, "0312345678");
    // 1_100_000 gồm 10% VAT → VAT = 100_000
    expect(inv.vatAmount).toBe(100_000);
    expect(inv.taxRate).toBe(10);
    expect(inv.buyerTax).toBe("0312345678");
    expect(inv.buyerAddress).toBe("1 Test");
    expect(inv.number).toMatch(/^INV-\d{5}$/);
    const again = await issueInvoice(order.id, "khac");
    expect(again.id).toBe(inv.id);
    await prisma.invoice.delete({ where: { id: inv.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });

  it("canViewInvoice: chỉ admin hoặc chủ đơn xem được (chống IDOR)", () => {
    expect(canViewInvoice(null, "khach@kit.vn")).toBe(false);
    expect(canViewInvoice({ email: "khac@kit.vn", role: "customer" }, "khach@kit.vn")).toBe(false);
    expect(canViewInvoice({ email: "Khach@Kit.vn", role: "customer" }, "khach@kit.vn")).toBe(true);
    expect(canViewInvoice({ email: "admin@x.vn", role: "admin" }, "khach@kit.vn")).toBe(true);
  });

  it("thuế suất tuỳ chọn 8%", async () => {
    const order = await seedOrder();
    const inv = await issueInvoice(order.id, "", { taxRate: 8 });
    expect(inv.vatAmount).toBe(Math.round((1_100_000 * 8) / 108));
    await prisma.invoice.delete({ where: { id: inv.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });
});
