import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { LOW_STOCK_THRESHOLD, shopStats } from "./shop-stats";
import { listCustomers } from "./leads";
import { listOrders } from "./order";

const vnFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

describe("task7: pagination", () => {
  it("listOrders page 1/2 deterministic trên tập đơn cô lập theo email", async () => {
    const ts = Date.now();
    const rnd = Math.floor(Math.random() * 1e6);
    const email = `t7-page-${ts}-${rnd}@kit.vn`;
    const seqBase = (Date.now() % 1_000_000) * 1000 + Math.floor(Math.random() * 900);
    const ids: string[] = [];
    try {
      // 3 đơn cùng email, createdAt cách nhau 1s để thứ tự desc ổn định
      // (không raw SQL datetime — Prisma tự serialize Date).
      for (let i = 0; i < 3; i++) {
        const o = await prisma.order.create({
          data: {
            code: `T7P-${ts}-${rnd}-${i}`,
            seq: seqBase + i,
            customer: "T7 Paging",
            email,
            phone: "0900000000",
            address: "1 Test",
            subtotal: 1000,
            shippingFee: 0,
            discount: 0,
            total: 1000,
            paymentMethod: "cod",
            items: {
              create: [{ productId: "p5", slug: "s", name: "SP", image: "", price: 1000, quantity: 1 }],
            },
          },
        });
        await prisma.order.update({
          where: { id: o.id },
          data: { createdAt: new Date(Date.now() + i * 1000) },
        });
        ids.push(o.id);
      }
      // Filter theo email duy nhất → tập 3 đơn, không phụ thuộc số đơn toàn cục.
      const full = await listOrders({ email });
      expect(full).toHaveLength(3);
      const p1 = await listOrders({ email }, { page: 1, pageSize: 2 });
      expect(p1.map((o) => o.id)).toEqual(full.slice(0, 2).map((o) => o.id));
      const p2 = await listOrders({ email }, { page: 2, pageSize: 2 });
      expect(p2.map((o) => o.id)).toEqual(full.slice(2, 4).map((o) => o.id));
      // backward-compat: không opts trả hết tập filter
      expect((await listOrders({ email })).length).toBe(3);
    } finally {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
      await prisma.order.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("listCustomers page 1/page 2 phân trang", async () => {
    // Tự tạo 2 khách — test không phụ thuộc lịch sử DB chia sẻ (chuẩn AGENTS.md).
    const stamp = Date.now();
    const created = await Promise.all(
      (["a", "b"] as const).map((s) =>
        prisma.user.create({
          data: {
            email: `cust-${s}-${stamp}@kit.vn`,
            name: `Khách test ${s.toUpperCase()}`,
            passwordHash: "-",
          },
        }),
      ),
    );
    try {
      const full = await listCustomers();
      expect(full.length).toBeGreaterThanOrEqual(2);
      const ids = new Set(full.map((u) => u.id));
      for (const u of created) expect(ids.has(u.id)).toBe(true);

      const p1 = await listCustomers({ page: 1, pageSize: 1 });
      const p2 = await listCustomers({ page: 2, pageSize: 1 });
      // Mỗi trang ≤ pageSize, 2 trang không giao nhau, id đều thuộc tập full.
      expect(p1.length).toBeLessThanOrEqual(1);
      expect(p2.length).toBeLessThanOrEqual(1);
      for (const u of [...p1, ...p2]) expect(ids.has(u.id)).toBe(true);
      const overlap = p1.filter((a) => p2.some((b) => b.id === a.id));
      expect(overlap).toHaveLength(0);
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: created.map((u) => u.id) } } });
    }
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
