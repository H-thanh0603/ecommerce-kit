import { prisma } from "@/server/db";
import { toProduct } from "@/server/map";
import { productInclude } from "@/server/product-include";
import type { OrderStatus } from "@/types";

/** Tách từ order.ts — chỉ thống kê/vận hành admin, không liên quan ghi đơn. */

export const LOW_STOCK_THRESHOLD = 5;

const VN_TZ = "Asia/Ho_Chi_Minh";
const VN_DAY_MS = 86400000;
const vnDayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: VN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD của 1 mốc theo giờ VN. */
export function vnDateKey(d: Date) {
  return vnDayFmt.format(d);
}

/** Nửa đêm VN (00:00 Asia/Ho_Chi_Minh) của ngày chứa mốc d, trả về Date UTC tương ứng. VN = UTC+7 quanh năm. */
export function vnMidnightUtc(d: Date) {
  const [y, m, day] = vnDayFmt.format(d).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day) - 7 * 3600 * 1000);
}

export async function shopStats() {
  const now = new Date();
  const startToday = vnMidnightUtc(now);
  const [ny, nm] = vnDateKey(now).split("-").map(Number);
  const startMonth = new Date(Date.UTC(ny, nm - 1, 1) - 7 * 3600 * 1000);
  const startYesterday = new Date(startToday.getTime() - VN_DAY_MS);
  const startPrevMonth = new Date(Date.UTC(ny, nm - 2, 1) - 7 * 3600 * 1000);
  const start7 = new Date(startToday.getTime() - 6 * VN_DAY_MS);
  const open: OrderStatus[] = ["pending", "confirmed", "shipping"];

  const [
    booked, collected, today, month, yesterday, prevMonth,
    byStatus, productCount, lowRows, topRows, leadCount, weekOrders,
    refundsPending, returnsPending, reviewsPending,
  ] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { status: { not: "cancelled" } } }),
    prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { status: "completed" } }),
    prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: { not: "cancelled" }, createdAt: { gte: startToday } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { status: { not: "cancelled" }, createdAt: { gte: startMonth } },
    }),
    // Kỳ trước để KPI có mốc so sánh (rule: "Bao nhiêu? So với cái gì?")
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "cancelled" }, createdAt: { gte: startYesterday, lt: startToday } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "cancelled" }, createdAt: { gte: startPrevMonth, lt: startMonth } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: true, _sum: { total: true } }),
    prisma.product.count({ where: { published: true } }),
    prisma.product.findMany({
      where: { published: true, stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { stock: "asc" },
      take: 8,
      include: productInclude,
    }),
    prisma.product.findMany({ orderBy: { sold: "desc" }, take: 5, include: productInclude }),
    prisma.lead.count(),
    prisma.order.findMany({
      where: { createdAt: { gte: start7 }, status: { not: "cancelled" } },
      select: { createdAt: true, total: true },
    }),
    // Việc chờ xử lý — dashboard phải trả lời "tôi cần làm gì tiếp theo?"
    prisma.refund.count({ where: { status: "pending" } }),
    prisma.returnRequest.count({ where: { status: "pending" } }),
    prisma.review.count({ where: { status: "pending" } }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start7.getTime() + i * VN_DAY_MS);
    const key = vnDateKey(d);
    const sum = weekOrders
      .filter((o) => vnDateKey(o.createdAt) === key)
      .reduce((s, o) => s + o.total, 0);
    return { date: key.slice(5), total: sum };
  });

  return {
    orderCount: booked._count,
    productCount,
    revenue: booked._sum.total ?? 0,
    revenueCollected: collected._sum.total ?? 0,
    revenueToday: today._sum.total ?? 0,
    revenueMonth: month._sum.total ?? 0,
    revenueYesterday: yesterday._sum.total ?? 0,
    revenuePrevMonth: prevMonth._sum.total ?? 0,
    ordersToday: today._count,
    refundsPending,
    returnsPending,
    reviewsPending,
    ordersOpen: byStatus.filter((s) => open.includes(s.status as OrderStatus)).reduce((n, s) => n + s._count, 0),
    lowStock: lowRows.length,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count, total: s._sum.total ?? 0 })),
    lowProducts: lowRows.map(toProduct),
    topProducts: topRows.map(toProduct),
    leadCount,
    days,
  };
}

/** Mail cho admin khi tồn chạm ngưỡng — mỗi SKU 1 mail/ngày (chống spam). */
export async function alertLowStock(items: Array<{ productId: string; skuId?: string }>) {
  try {
    if (!items.length) return;
    const admin = process.env.ADMIN_EMAIL || (await import("@/config/site")).siteConfig.admin.email;
    const startDay = vnMidnightUtc(new Date());
    // Gộp N+1 query thành batch: 1 findMany SKU + 1 findMany Product + 1 findMany MailLog.
    const skuIds = [...new Set(items.filter((i) => i.skuId).map((i) => i.skuId as string))];
    const skus = skuIds.length
      ? await prisma.sku.findMany({ where: { id: { in: skuIds } }, include: { product: true } })
      : [];
    const skuById = new Map(skus.map((s) => [s.id, s]));
    const needProductIds = [
      ...new Set(items.filter((i) => !i.skuId || !skuById.has(i.skuId)).map((i) => i.productId)),
    ];
    const products = needProductIds.length
      ? await prisma.product.findMany({ where: { id: { in: needProductIds } } })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));
    for (const s of skus) productById.set(s.product.id, s.product);
    const lows = new Map<string, { name: string; label: string; stock: number }>();
    for (const it of items) {
      const sku = it.skuId ? skuById.get(it.skuId) : undefined;
      const product = sku?.product || productById.get(it.productId);
      if (!product) continue;
      const stock = sku ? sku.stock : product.stock;
      if (stock > LOW_STOCK_THRESHOLD) continue;
      const tag = `lowstock:${sku?.id || product.id}`;
      if (!lows.has(tag)) {
        lows.set(tag, { name: product.name, label: sku?.label || "", stock });
      }
    }
    if (!lows.size) return;
    const sentToday = await prisma.mailLog.findMany({
      where: { to: admin, createdAt: { gte: startDay }, body: { contains: "lowstock:" } },
      select: { body: true },
    });
    const sentBody = sentToday.map((m) => m.body).join("\n");
    const { sendMail } = await import("@/server/mail");
    for (const [tag, info] of lows) {
      if (sentBody.includes(tag)) continue;
      await sendMail(
        admin,
        `[Tồn thấp] ${info.name}${info.label ? ` (${info.label})` : ""} còn ${info.stock}`,
        `${tag} — nhập thêm hàng. Ngưỡng ${LOW_STOCK_THRESHOLD}.`,
      );
    }
  } catch {
    /* best-effort */
  }
}
