import { prisma } from "@/server/db";
import { toOrder, toProduct } from "@/server/map";
import { processPayment } from "@/server/payments";
import { onOrderCreated, onOrderStatusChanged } from "@/server/events";
import { assertCouponTx } from "@/server/coupon";
import { consumeGiftTx } from "@/server/giftcard";
import { quoteOrder } from "@/server/pricing";
import { isFeatureOn } from "@/server/settings";
import { defaultWarehouse } from "@/server/warehouse";
import { grantOrderPoints, spendPointsTx } from "@/server/membership";
import { productInclude } from "@/server/product-include";
import { type CartItem, type OrderStatus } from "@/types";
import type { Prisma } from "@prisma/client";

export async function listOrders(
  filter?: {
    email?: string;
    userId?: string;
    status?: string;
    q?: string;
  },
  opts?: { page?: number; pageSize?: number },
) {
  const and: Prisma.OrderWhereInput[] = [];
  if (filter?.status) and.push({ status: filter.status });
  if (filter?.email || filter?.userId) {
    and.push({
      OR: [
        ...(filter.email ? [{ email: filter.email }] : []),
        ...(filter.userId ? [{ userId: filter.userId }] : []),
      ],
    });
  }
  if (filter?.q) {
    const q = filter.q.trim();
    and.push({
      OR: [
        { code: { contains: q } },
        { customer: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ],
    });
  }
  const paged = opts?.page != null || opts?.pageSize != null;
  const page = Math.max(1, Math.floor(opts?.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.floor(opts?.pageSize ?? 20) || 20));
  const rows = await prisma.order.findMany({
    where: and.length ? { AND: and } : undefined,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    ...(paged ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
  });
  return rows.map(toOrder);
}

export async function getOrderByCode(code: string) {
  const row = await prisma.order.findUnique({ where: { code }, include: { items: true } });
  return row ? toOrder(row) : null;
}

export async function updateOrderStatus(id: string, status: OrderStatus, actorEmail = "") {
  const row = await prisma.order.update({
    where: { id },
    data: { status },
    include: { items: true },
  });
  const order = toOrder(row);
  await onOrderStatusChanged(order, status);
  const { logOrderEvent } = await import("@/server/order-events");
  await logOrderEvent(row.id, "status", `Chuyển trạng thái → ${status}`, actorEmail);
  if (status === "completed" && (await isFeatureOn("membership")) && row.userId) {
    const g = await grantOrderPoints(row.userId, order.total);
    await prisma.order.update({ where: { id }, data: { pointsEarned: g.earned } });
  }
  if (actorEmail) {
    const { logAudit } = await import("@/server/audit");
    await logAudit({
      actorEmail,
      action: "order.status",
      entity: "Order",
      entityId: row.code,
      after: status,
    });
  }
  return order;
}

export type CheckoutInput = {
  customer: string;
  email: string;
  phone: string;
  address: string;
  note?: string;
  paymentMethod: string;
  couponCode?: string;
  giftCode?: string;
  bundleId?: string;
  items: CartItem[];
  userId?: string;
  innerCity?: boolean;
  ip?: string;
  pointsToUse?: number;
  toDistrictId?: number;
  toWardCode?: string;
  /** Idempotency key — unique trên Order, double-POST không tạo 2 đơn. */
  clientRequestId?: string;
};

export async function nextOrderSeq(tx: Prisma.TransactionClient) {
  const row = await tx.orderCounter.upsert({
    where: { id: "order" },
    create: { id: "order", value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

/** Method được phép checkout — còn lại (zalopay/unknown/...) reject TRƯỚC transaction. */
const SUPPORTED_PAYMENT_METHODS = new Set(["cod", "bankTransfer", "vnpay", "momo"]);

export async function createOrder(input: CheckoutInput) {
  if (!input.items.length) throw new Error("Giỏ hàng trống");
  // Whitelist TRƯỚC transaction: method lạ (zalopay/unknown/...) bị từ chối
  // trước khi trừ tồn — không bao giờ tạo đơn + trừ tồn cho method không hỗ trợ.
  if (!SUPPORTED_PAYMENT_METHODS.has(input.paymentMethod)) {
    throw new Error("Phương thức thanh toán không hỗ trợ");
  }
  if (input.paymentMethod === "vnpay") {
    const { vnpayConfigured } = await import("@/server/vnpay");
    if (!vnpayConfigured()) throw new Error("Chưa cấu hình VNPay (.env VNPAY_*)");
  }
  if (input.paymentMethod === "momo") {
    const { momoConfigured } = await import("@/server/momo");
    if (!momoConfigured()) throw new Error("Chưa cấu hình MoMo (.env MOMO_*)");
  }
  const warehouse = (await isFeatureOn("multiWarehouse")) ? await defaultWarehouse() : null;

  const ids = [...new Set(input.items.map((i) => i.productId))];
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: ids }, published: true },
    include: productInclude,
  });
  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  const lines = input.items.map((item) => {
    const p = byId.get(item.productId);
    if (!p) throw new Error(`Sản phẩm không còn bán: ${item.name}`);
    const sku = item.skuId
      ? p.skus.find((s) => s.id === item.skuId)
      : item.variantLabel
        ? p.skus.find((s) => s.label === item.variantLabel)
        : p.skus[0];
    if (p.skus.length) {
      if (!sku) throw new Error(`Chọn biến thể cho ${p.name}`);
      if (sku.stock < item.quantity) throw new Error(`Không đủ tồn kho: ${p.name} (${sku.label})`);
    } else if (p.stock < item.quantity) {
      throw new Error(`Không đủ tồn kho: ${p.name}`);
    }
    return {
      product: p,
      sku,
      quantity: item.quantity,
      variantLabel: sku?.label || item.variantLabel || "",
    };
  });

  const { subtotal, coupon, ship, off, pointsDiscount, pointsToUse, gift, giftAmount, bundle, bundleDiscount, total } =
    await quoteOrder({
      lines: lines.map((l) => ({
        productId: l.product.id,
        skuId: l.sku?.id,
        price: l.product.price,
        quantity: l.quantity,
        unit: l.product.unit,
        weightGrams: l.product.weightGrams,
      })),
      couponCode: input.couponCode,
      email: input.email,
      userId: input.userId,
      innerCity: input.innerCity,
      toDistrictId: input.toDistrictId,
      toWardCode: input.toWardCode,
      giftCode: input.giftCode,
      bundleId: input.bundleId,
      pointsToUse: input.pointsToUse,
    });

  const order = await prisma.$transaction(async (tx) => {
    const seq = await nextOrderSeq(tx);
    const code = `ATL-${String(seq).padStart(5, "0")}`;

    for (const line of lines) {
      if (line.sku) {
        const updated = await tx.sku.updateMany({
          where: { id: line.sku.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (updated.count !== 1) throw new Error(`Không đủ tồn kho: ${line.product.name}`);
      } else {
        const updated = await tx.product.updateMany({
          where: { id: line.product.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity }, updatedAt: new Date() },
        });
        if (updated.count !== 1) throw new Error(`Không đủ tồn kho: ${line.product.name}`);
      }
      await tx.product.update({
        where: { id: line.product.id },
        data: { sold: { increment: line.quantity }, updatedAt: new Date() },
      });
      await tx.stockMovement.create({
        data: {
          productId: line.product.id,
          skuId: line.sku?.id,
          delta: -line.quantity,
          reason: "order",
          ref: code,
        },
      });
      if (warehouse) {
        const { decrementWarehouseTx } = await import("@/server/warehouse");
        const w = await decrementWarehouseTx(tx, warehouse.id, line.product.id, line.sku?.label || "", line.quantity);
        if (w === "insufficient") throw new Error(`Không đủ tồn kho ${warehouse.name}: ${line.product.name}`);
      }
    }

    const created = await tx.order.create({
      data: {
        code,
        seq,
        userId: input.userId,
        customer: input.customer,
        email: input.email,
        phone: input.phone,
        address: input.address,
        innerCity: Boolean(input.innerCity),
        note: input.note || "",
        subtotal,
        shippingFee: ship,
        discount: off + bundleDiscount,
        total,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "vnpay" ? "pending" : "unpaid",
        status: "pending",
        couponCode: coupon?.code,
        bundleCode: bundle?.name || "",
        pointsUsed: pointsToUse,
        warehouseId: warehouse?.id,
        clientRequestId: input.clientRequestId || null,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            skuId: l.sku?.id,
            slug: l.product.slug,
            name: l.product.name,
            image: l.product.images[0]?.url || "",
            price: l.product.price,
            quantity: l.quantity,
            variantLabel: l.variantLabel,
          })),
        },
      },
      include: { items: true },
    });

    if (coupon) {
      await assertCouponTx(tx, coupon.id, subtotal, input.email, input.userId);
      await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId: input.userId,
          email: input.email,
          orderId: created.id,
        },
      });
    }

    if (pointsToUse > 0 && input.userId) {
      await spendPointsTx(tx, input.userId, pointsToUse);
    }

    if (gift && giftAmount > 0) {
      await consumeGiftTx(tx, gift.gift.id, created.id, giftAmount);
    }

    if (input.userId) {
      await tx.cartLine.deleteMany({ where: { userId: input.userId } });
    }

    return created;
  });

  const mapped = toOrder(order);
  await onOrderCreated(mapped);
  const { logOrderEvent } = await import("@/server/order-events");
  await logOrderEvent(order.id, "created", `Ghi đơn ${mapped.code} · ${mapped.paymentMethod} · ${mapped.total}đ`);
  await alertLowStock(lines.map((l) => ({ productId: l.product.id, skuId: l.sku?.id })));
  let payUrl: string | undefined;
  // Đơn đã commit (trừ tồn) — mọi lỗi/thất bại build payUrl đều giữ pending
  // cho thử lại (needsRetry), KHÔNG throw sau commit (throw cũng không hoàn
  // tồn, chỉ làm client tưởng mất đơn). Áp dụng mọi method, kể cả cod/bankTransfer.
  try {
    const pay = await processPayment(input.paymentMethod, { code: mapped.code, total: mapped.total, ip: input.ip });
    if (!pay.ok) return Object.assign(mapped, { payUrl: undefined, needsRetry: true });
    payUrl = pay.payUrl;
  } catch {
    return Object.assign(mapped, { payUrl: undefined, needsRetry: true });
  }
  return Object.assign(mapped, { payUrl });
}

export const LOW_STOCK_THRESHOLD = 5;

/** Mail cho admin khi tồn chạm ngưỡng — mỗi SKU 1 mail/ngày (chống spam). */
export async function alertLowStock(items: Array<{ productId: string; skuId?: string }>) {
  try {
    if (!items.length) return;
    const admin = process.env.ADMIN_EMAIL || "admin@ekkit.vn";
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
  const start7 = new Date(startToday.getTime() - 6 * VN_DAY_MS);
  const open: OrderStatus[] = ["pending", "confirmed", "shipping"];

  const [booked, collected, today, month, byStatus, productCount, lowRows, topRows, leadCount, weekOrders] =
    await Promise.all([
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
    ordersToday: today._count,
    ordersOpen: byStatus.filter((s) => open.includes(s.status as OrderStatus)).reduce((n, s) => n + s._count, 0),
    lowStock: lowRows.length,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count, total: s._sum.total ?? 0 })),
    lowProducts: lowRows.map(toProduct),
    topProducts: topRows.map(toProduct),
    leadCount,
    days,
  };
}

export async function listCustomers(opts?: { page?: number; pageSize?: number }) {
  const paged = opts?.page != null || opts?.pageSize != null;
  const page = Math.max(1, Math.floor(opts?.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.floor(opts?.pageSize ?? 20) || 20));
  const rows = await prisma.user.findMany({
    where: { role: "customer" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
    ...(paged ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
  });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    points: u.points,
    memberTier: u.memberTier,
    orderCount: u._count.orders,
    createdAt: u.createdAt.toISOString().slice(0, 10),
  }));
}

export async function createLead(data: { name: string; email: string; phone?: string; message: string }) {
  return prisma.lead.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      message: data.message,
    },
  });
}

export async function listLeads() {
  return prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
}

export async function subscribeNewsletter(email: string) {
  return prisma.newsletter.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase() },
    update: {},
  });
}

export async function listNewsletter() {
  return prisma.newsletter.findMany({ orderBy: { createdAt: "desc" } });
}
