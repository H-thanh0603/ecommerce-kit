import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createOrder, getProductById } from "./commerce";
import { defaultWarehouse, setWarehouseStock } from "./warehouse";
import { deleteGift, getGift, quoteGift, upsertGift } from "./giftcard";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

describe("giftcard", () => {
  it("CRUD + chuẩn hoá mã", async () => {
    const code = `G${uid()}`.replace(/-/g, "").slice(0, 12);
    const g = await upsertGift({ code: code.toLowerCase(), balance: 200_000, note: "test" });
    expect(g.code).toBe(code.toUpperCase());
    expect(await getGift(` ${code.toLowerCase()} `)).toBeTruthy();
    await prisma.giftRedemption.deleteMany({ where: { giftId: g.id } });
    await deleteGift(g.id);
    expect(await getGift(code)).toBeNull();
  });

  it("hết hạn / hết dư / tắt đều bị chặn", async () => {
    const c1 = await upsertGift({ code: `E${uid()}`.replace(/-/g, "").slice(0, 12), balance: 10_000, expiresAt: new Date(Date.now() - 1000) });
    const c2 = await upsertGift({ code: `Z${uid()}`.replace(/-/g, "").slice(0, 12), balance: 0 });
    const c3 = await upsertGift({ code: `O${uid()}`.replace(/-/g, "").slice(0, 12), balance: 10_000, active: false });
    await expect(quoteGift(c1.code, 100_000)).rejects.toThrow(/hết hạn/);
    await expect(quoteGift(c2.code, 100_000)).rejects.toThrow(/hết số dư/);
    expect(await getGift(c3.code)).toBeNull();
    for (const c of [c1, c2, c3]) {
      await prisma.giftRedemption.deleteMany({ where: { giftId: c.id } });
      await deleteGift(c.id);
    }
  });

  it("checkout trừ thẻ vào tổng + trừ số dư, tối đa phần còn lại", async () => {
    const before = await getProductById("p2");
    const sku = before!.skus?.[0];
    await prisma.sku.update({ where: { id: sku!.id }, data: { stock: 10 } });
    const wh = await defaultWarehouse();
    if (wh) await setWarehouseStock(wh.id, "p2", sku!.label, 10);
    // Thẻ 50K cho đơn ~ (giá p1 + ship) → số dư còn lại = 0
    const gift = await upsertGift({ code: `C${uid()}`.replace(/-/g, "").slice(0, 12), balance: 50_000 });
    const order = await createOrder({
      customer: "Gift",
      email: `g${uid()}@kit.vn`.replace(/-/g, ""),
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "cod",
      giftCode: gift.code,
      items: [
        {
          productId: "p2",
          slug: before!.slug,
          name: before!.name,
          image: before!.images[0] || "",
          price: before!.price,
          quantity: 1,
          skuId: sku!.id,
          variantLabel: sku!.label,
        },
      ],
    });
    expect(order.total).toBeLessThan(before!.price + 50_000);
    const after = await prisma.giftCard.findUnique({ where: { id: gift.id } });
    expect(after!.balance).toBe(0);
    const red = await prisma.giftRedemption.findMany({ where: { giftId: gift.id } });
    expect(red.length).toBe(1);
    await prisma.giftRedemption.deleteMany({ where: { giftId: gift.id } });
    await deleteGift(gift.id);
  });
});
