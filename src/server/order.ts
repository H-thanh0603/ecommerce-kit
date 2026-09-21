import { prisma } from "@/server/db";
import { toOrder, toProduct } from "@/server/map";
import { processPayment } from "@/server/payments";
import { onOrderCreated, onOrderStatusChanged } from "@/server/events";
import { discountAmount } from "@/lib/format";
import { quoteShipping } from "@/server/shipping";
import { isFeatureOn } from "@/server/settings";
import { defaultWarehouse } from "@/server/warehouse";
import { discountFromPoints, grantOrderPoints, spendPoints } from "@/server/membership";
import { productInclude } from "@/server/product-include";
import { lineAmount, type CartItem, type OrderStatus } from "@/types";
import type { Prisma } from "@prisma/client";

export async function listOrders(filter?: {
  email?: string;
  userId?: string;
  status?: string;
  q?: string;
}) {
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
  const rows = await prisma.order.findMany({
    where: and.length ? { AND: and } : undefined,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

export async function getOrderByCode(code: string) {
  const row = await prisma.order.findUnique({ where: { code }, include: { items: true } });
  return row ? toOrder(row) : null;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const row = await prisma.order.update({
    where: { id },
    data: { status },
    include: { items: true },
  });
  const order = toOrder(row);
  await onOrderStatusChanged(order, status);
  if (status === "completed" && (await isFeatureOn("membership")) && row.userId) {
    const g = await grantOrderPoints(row.userId, order.total);
    await prisma.order.update({ where: { id }, data: { pointsEarned: g.earned } });
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
  items: CartItem[];
  userId?: string;
  innerCity?: boolean;
  ip?: string;
  pointsToUse?: number;
  toDistrictId?: number;
  toWardCode?: string;
};

export async function nextOrderSeq(tx: Prisma.TransactionClient) {
  const row = await tx.orderCounter.upsert({
    where: { id: "order" },
    create: { id: "order", value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

export async function createOrder(input: CheckoutInput) {
  if (!input.items.length) throw new Error("Giỏ hàng trống");
  if (input.paymentMethod === "vnpay") {
    const { vnpayConfigured } = await import("@/server/vnpay");
    if (!vnpayConfigured()) throw new Error("Chưa cấu hình VNPay (.env VNPAY_*)");
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
      if (sku.stock < item.quantity) throw new Error(`Không đủ tồn: ${p.name} (${sku.label})`);
    } else if (p.stock < item.quantity) {
      throw new Error(`Không đủ tồn: ${p.name}`);
    }
    return {
      product: p,
      sku,
      quantity: item.quantity,
      variantLabel: sku?.label || item.variantLabel || "",
    };
  });

  const { assertCoupon } = await import("@/server/coupon");
  const subtotal = lines.reduce(
    (s, l) => s + lineAmount(l.product.price, l.quantity, l.product.unit === "kg" ? "kg" : "cai"),
    0,
  );
  const coupon = input.couponCode
    ? await assertCoupon(input.couponCode, subtotal, input.email, input.userId)
    : null;
  const weightGrams = lines.reduce((s, l) => s + (l.product.weightGrams || 500) * (l.product.unit === "kg" ? 1 : l.quantity), 0);
  const quote = await quoteShipping({
    subtotal,
    innerCity: input.innerCity,
    weightGrams,
    toDistrictId: input.toDistrictId,
    toWardCode: input.toWardCode,
  });
  const shipRaw = quote.fee;
  const ship = coupon?.type === "shipping" ? 0 : shipRaw;
  const off = coupon
    ? discountAmount(subtotal, {
        type: coupon.type as "percent" | "fixed" | "shipping",
        value: coupon.value,
        minOrder: coupon.minOrder,
      })
    : 0;
  let pointsDiscount = 0;
  if ((await isFeatureOn("membership")) && input.userId && input.pointsToUse) {
    pointsDiscount = discountFromPoints(input.pointsToUse);
  }
  const total = Math.max(0, subtotal + ship - off - pointsDiscount);

  const order = await prisma.$transaction(async (tx) => {
    const seq = await nextOrderSeq(tx);
    const code = `ATL-${String(seq).padStart(5, "0")}`;

    for (const line of lines) {
      if (line.sku) {
        const updated = await tx.sku.updateMany({
          where: { id: line.sku.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (updated.count !== 1) throw new Error(`Không đủ tồn: ${line.product.name}`);
      } else {
        const updated = await tx.product.updateMany({
          where: { id: line.product.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity }, updatedAt: new Date() },
        });
        if (updated.count !== 1) throw new Error(`Không đủ tồn: ${line.product.name}`);
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
        discount: off,
        total,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "vnpay" ? "pending" : "unpaid",
        status: "pending",
        couponCode: coupon?.code,
        pointsUsed: input.pointsToUse || 0,
        warehouseId: warehouse?.id,
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
      await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId: input.userId,
          email: input.email,
          orderId: created.id,
        },
      });
    }

    if (input.userId) {
      await tx.cartLine.deleteMany({ where: { userId: input.userId } });
    }

    return created;
  });

  const mapped = toOrder(order);
  await onOrderCreated(mapped);
  if ((await isFeatureOn("membership")) && input.userId && input.pointsToUse) {
    await spendPoints(input.userId, input.pointsToUse);
  }
  let payUrl: string | undefined;
  if (input.paymentMethod === "vnpay") {
    const pay = await processPayment("vnpay", { code: mapped.code, total: mapped.total, ip: input.ip });
    if (!pay.ok) throw new Error(pay.message);
    payUrl = pay.payUrl;
  } else {
    const pay = await processPayment(input.paymentMethod, { code: mapped.code, total: mapped.total });
    if (!pay.ok) throw new Error(pay.message);
  }
  return Object.assign(mapped, { payUrl });
}

export async function shopStats() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const start7 = new Date(startToday.getTime() - 6 * 86400000);
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
        where: { published: true, stock: { lt: 15 } },
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
    const d = new Date(start7.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const sum = weekOrders
      .filter((o) => o.createdAt.toISOString().slice(0, 10) === key)
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

export async function listCustomers() {
  const rows = await prisma.user.findMany({
    where: { role: "customer" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
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
