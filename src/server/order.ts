import { prisma } from "@/server/db";
import { siteConfig } from "@/config/site";
import { toOrder } from "@/server/map";
import { processPayment } from "@/server/payments";
import { onOrderCreated, onOrderStatusChanged } from "@/server/events";
import { assertCouponTx } from "@/server/coupon";
import { consumeGiftTx } from "@/server/giftcard";
import { quoteOrder } from "@/server/pricing";
import { isFeatureOn } from "@/server/settings";
import { defaultWarehouse } from "@/server/warehouse";
import { grantOrderPointsTx, spendPointsTx } from "@/server/membership";
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

/**
 * Đảo ngược đơn khi hủy: hoàn tồn SKU/product + kho, hoàn điểm đã tiêu,
 * thu hồi lượt dùng coupon (xóa redemption — maxUses đếm từ redemption),
 * hoàn số dư giftcard đã consume. Chỉ gọi trong transaction sau khi đã
 * claim status (idempotent — hủy 2 lần không hoàn 2 lần).
 */
async function cancelOrderReversalTx(tx: Prisma.TransactionClient, orderId: string) {
  const row = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!row) return;
  const ref = `CAN-${row.code}`;
  for (const line of row.items) {
    if (line.skuId) {
      await tx.sku.update({ where: { id: line.skuId }, data: { stock: { increment: line.quantity } } });
    } else {
      await tx.product.update({ where: { id: line.productId }, data: { stock: { increment: line.quantity } } });
    }
    await tx.product.update({ where: { id: line.productId }, data: { sold: { decrement: line.quantity } } });
    await tx.stockMovement.create({
      data: { productId: line.productId, skuId: line.skuId, delta: line.quantity, reason: "cancel", ref },
    });
    if (row.warehouseId) {
      const skuRow = line.skuId ? await tx.sku.findUnique({ where: { id: line.skuId } }) : null;
      const skuKey = skuRow?.label || line.variantLabel || "";
      await tx.warehouseStock.upsert({
        where: { warehouseId_productId_skuKey: { warehouseId: row.warehouseId, productId: line.productId, skuKey } },
        create: { warehouseId: row.warehouseId, productId: line.productId, skuKey, stock: line.quantity },
        update: { stock: { increment: line.quantity } },
      });
    }
  }
  if (row.pointsUsed > 0 && row.userId) {
    await tx.user.update({ where: { id: row.userId }, data: { points: { increment: row.pointsUsed } } });
  }
  await tx.couponRedemption.deleteMany({ where: { orderId: row.id } });
  const gifts = await tx.giftRedemption.findMany({ where: { orderId: row.id } });
  for (const g of gifts) {
    await tx.giftCard.update({ where: { id: g.giftId }, data: { balance: { increment: g.amount } } });
    await tx.giftRedemption.delete({ where: { id: g.id } });
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus, actorEmail = "") {
  const prior = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!prior) throw new Error("Không tìm thấy đơn hàng");
  if (prior.status === status) {
    const same = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    return toOrder(same!);
  }
  let row;
  if (status === "cancelled") {
    // Claim status bằng updateMany có điều kiện — 2 admin hủy cùng lúc chỉ 1 lần hoàn tồn.
    row = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: { not: "cancelled" } },
        data: { status },
      });
      if (claimed.count !== 1) return tx.order.findUnique({ where: { id }, include: { items: true } });
      await cancelOrderReversalTx(tx, id);
      return tx.order.findUnique({ where: { id }, include: { items: true } });
    });
    // Đơn completed nên đi luồng trả hàng/hoàn tiền — hủy trực tiếp sẽ hoàn tồn 2 lần nếu return đã restock.
    if (prior.status === "completed") {
      const { logOrderEvent } = await import("@/server/order-events");
      await logOrderEvent(id, "status", "Cảnh báo: hủy đơn đã completed — cân nhắc luồng trả hàng/hoàn tiền", actorEmail);
    }
  } else if (status === "completed") {
    // Claim tương tự nhánh cancelled: chống cộng điểm 2 lần khi 2 admin hoàn tất cùng lúc.
    // Điểm cộng trong cùng transaction bằng increment — không lost update.
    const membershipOn = await isFeatureOn("membership");
    row = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: { not: "completed" } },
        data: { status },
      });
      const cur = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (claimed.count === 1 && cur && membershipOn && cur.userId) {
        const g = await grantOrderPointsTx(tx, cur.userId, cur.total);
        if (g.earned > 0) {
          await tx.order.update({ where: { id }, data: { pointsEarned: g.earned } });
        }
      }
      return cur;
    });
  } else {
    row = await prisma.order.update({ where: { id }, data: { status }, include: { items: true } });
  }
  if (!row) throw new Error("Không tìm thấy đơn hàng");
  const order = toOrder(row);
  await onOrderStatusChanged(order, status);
  const { logOrderEvent } = await import("@/server/order-events");
  await logOrderEvent(row.id, "status", `Chuyển trạng thái → ${status}`, actorEmail);
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
const SUPPORTED_PAYMENT_METHODS = new Set(["cod", "bankTransfer", "vnpay", "momo", "vietqr"]);

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
    const code = `${siteConfig.orders.codePrefix}-${String(seq).padStart(5, "0")}`;

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
  const { alertLowStock } = await import("@/server/shop-stats");
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

/** Đơn pending quá N giờ (khách bỏ ngang ở trang gateway) → cron auto-cancel + hoàn tồn. */
export const PENDING_AUTO_CANCEL_HOURS = 24;

export async function cancelStalePendingOrders(
  olderThanHours = PENDING_AUTO_CANCEL_HOURS,
  opts?: { onlyIds?: string[] },
) {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);
  const stale = await prisma.order.findMany({
    where: {
      status: "pending",
      paymentStatus: { not: "paid" },
      createdAt: { lt: cutoff },
      ...(opts?.onlyIds?.length ? { id: { in: opts.onlyIds } } : {}),
    },
    select: { id: true },
    take: 200,
  });
  let cancelled = 0;
  for (const o of stale) {
    const row = await updateOrderStatus(o.id, "cancelled", "auto-expire");
    if (row.status === "cancelled") cancelled += 1;
  }
  return { checked: stale.length, cancelled };
}
