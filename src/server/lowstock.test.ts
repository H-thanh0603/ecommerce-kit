import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { alertLowStock } from "./order";

const ADMIN = process.env.ADMIN_EMAIL || "admin@atelier.vn";

describe("low-stock alert", () => {
  it("tồn trên ngưỡng thì im lặng; chạm ngưỡng thì mail 1 lần/ngày", async () => {
    await prisma.product.update({ where: { id: "p4" }, data: { stock: 100 } });
    await alertLowStock([{ productId: "p4" }]);
    const startDay = new Date();
    startDay.setHours(0, 0, 0, 0);
    expect(
      await prisma.mailLog.count({ where: { to: ADMIN, createdAt: { gte: startDay }, body: { contains: "lowstock:p4" } } }),
    ).toBe(0);

    await prisma.product.update({ where: { id: "p4" }, data: { stock: 3 } });
    await alertLowStock([{ productId: "p4" }]);
    await alertLowStock([{ productId: "p4" }]);
    expect(
      await prisma.mailLog.count({ where: { to: ADMIN, createdAt: { gte: startDay }, body: { contains: "lowstock:p4" } } }),
    ).toBe(1);
    await prisma.mailLog.deleteMany({ where: { to: ADMIN, body: { contains: "lowstock:p4" } } });
    await prisma.product.update({ where: { id: "p4" }, data: { stock: 12 } });
  });
});
