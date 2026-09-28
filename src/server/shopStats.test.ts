import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { LOW_STOCK_THRESHOLD, listCustomers, listOrders, shopStats } from "./order";

const vnFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

describe("task7: pagination", () => {
  it("listOrders page 2 trả đúng lát cắt (backward-compat: không opts trả hết)", async () => {
    const full = await listOrders();
    expect(full.length).toBeGreaterThan(2);
    const p2 = await listOrders({}, { page: 2, pageSize: 2 });
    expect(p2.map((o) => o.id)).toEqual(full.slice(2, 4).map((o) => o.id));
    // default không opts vẫn trả hết như cũ
    expect((await listOrders()).length).toBe(full.length);
  });

  it("listCustomers page 1/page 2 phân trang", async () => {
    const full = await listCustomers();
    expect(full.length).toBeGreaterThan(1);
    const p1 = await listCustomers({ page: 1, pageSize: 1 });
    expect(p1.map((u) => u.id)).toEqual(full.slice(0, 1).map((u) => u.id));
    const p2 = await listCustomers({ page: 2, pageSize: 1 });
    expect(p2.map((u) => u.id)).toEqual(full.slice(1, 2).map((u) => u.id));
  });
});

describe("task7: shopStats VN timezone + lowstock threshold", () => {
  it("days là 7 ngày VN gần nhất (Asia/Ho_Chi_Minh)", async () => {
    const stats = await shopStats();
    expect(stats.days).toHaveLength(7);
    const startTodayStr = vnFmt.format(new Date());
    const [y, m, d] = startTodayStr.split("-").map(Number);
    const startTodayUtc = Date.UTC(y, m - 1, d) - 7 * 3600 * 1000;
    const expected = Array.from({ length: 7 }, (_, i) => {
      const t = new Date(startTodayUtc + (i - 6) * 86400000);
      return vnFmt.format(t).slice(5);
    });
    expect(stats.days.map((x) => x.date)).toEqual(expected);
  });

  it("lowProducts không chứa SP trên ngưỡng chung LOW_STOCK_THRESHOLD", async () => {
    const ts = Date.now();
    const slug = `t7-low-${ts}`;
    const created = await prisma.product.create({
      data: {
        id: `t7-low-${ts}`,
        slug,
        name: `T7 Low ${ts}`,
        description: "t7 tmp",
        price: 1000,
        stock: LOW_STOCK_THRESHOLD + 2,
        published: true,
        categoryId: "cat-ao",
      },
    });
    try {
      const stats = await shopStats();
      expect(stats.lowProducts.every((p) => p.stock <= LOW_STOCK_THRESHOLD)).toBe(true);
      expect(stats.lowProducts.find((p) => p.id === created.id)).toBeUndefined();
    } finally {
      await prisma.product.delete({ where: { id: created.id } });
    }
  });
});
