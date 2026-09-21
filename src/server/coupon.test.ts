import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { assertCoupon, deleteCoupon, getCoupon, upsertCoupon } from "./coupon";

const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

describe("coupon", () => {
  it("CRUD cơ bản + chuẩn hoá mã in hoa", async () => {
    const code = `T${uid()}`.replace(/-/g, "").slice(0, 12);
    const created = await upsertCoupon({ code: code.toLowerCase(), type: "percent", value: 10, minOrder: 0 });
    expect(created.code).toBe(code.toUpperCase());
    expect(await getCoupon(`  ${code.toLowerCase()}  `)).toBeTruthy();
    await deleteCoupon(created.id);
    expect(await getCoupon(code)).toBeNull();
  });

  it("chặn đơn dưới minOrder", async () => {
    const code = `M${uid()}`.replace(/-/g, "").slice(0, 12);
    const c = await upsertCoupon({ code, type: "fixed", value: 50_000, minOrder: 500_000 });
    await expect(assertCoupon(code, 100_000)).rejects.toThrow(/tối thiểu/);
    const ok = await assertCoupon(code, 500_000);
    expect(ok.id).toBe(c.id);
    await deleteCoupon(c.id);
  });

  it("chặn mã hết hạn / chưa tới hạn", async () => {
    const past = `P${uid()}`.replace(/-/g, "").slice(0, 12);
    const future = `F${uid()}`.replace(/-/g, "").slice(0, 12);
    const c1 = await upsertCoupon({ code: past, type: "fixed", value: 10_000, minOrder: 0, endsAt: new Date(Date.now() - 1000) });
    const c2 = await upsertCoupon({ code: future, type: "fixed", value: 10_000, minOrder: 0, startsAt: new Date(Date.now() + 3600_000) });
    await expect(assertCoupon(past, 100_000)).rejects.toThrow(/hết hạn/);
    await expect(assertCoupon(future, 100_000)).rejects.toThrow(/chưa tới hạn/);
    await deleteCoupon(c1.id);
    await deleteCoupon(c2.id);
  });

  it("giới hạn tổng lượt (maxUses) và lượt mỗi user", async () => {
    const all = `A${uid()}`.replace(/-/g, "").slice(0, 12);
    const per = `U${uid()}`.replace(/-/g, "").slice(0, 12);
    const cAll = await upsertCoupon({ code: all, type: "fixed", value: 10_000, minOrder: 0, maxUses: 1 });
    const cPer = await upsertCoupon({ code: per, type: "fixed", value: 10_000, minOrder: 0, maxUsesPerUser: 1 });
    const email = `cp${uid()}@kit.vn`.replace(/-/g, "");
    await prisma.couponRedemption.create({ data: { couponId: cAll.id, email, orderId: `seed-${uid()}` } });
    await expect(assertCoupon(all, 100_000, "ai@kit.vn")).rejects.toThrow(/hết lượt/);
    await prisma.couponRedemption.create({ data: { couponId: cPer.id, email, orderId: `seed-${uid()}` } });
    await expect(assertCoupon(per, 100_000, email)).rejects.toThrow(/hết lượt mã này/);
    // Email khác vẫn dùng được mã giới hạn theo user
    const ok = await assertCoupon(per, 100_000, `other${uid()}@kit.vn`.replace(/-/g, ""));
    expect(ok.id).toBe(cPer.id);
    await prisma.couponRedemption.deleteMany({ where: { couponId: { in: [cAll.id, cPer.id] } } });
    await deleteCoupon(cAll.id);
    await deleteCoupon(cPer.id);
  });
});
