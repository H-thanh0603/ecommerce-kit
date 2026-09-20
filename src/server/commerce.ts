import { prisma } from "@/server/db";
import { toArticle, toCategory, toOrder, toProduct, toReview } from "@/server/map";
import { processPayment } from "@/server/payments";
import { onOrderCreated, onOrderStatusChanged } from "@/server/events";
import { discountAmount, shippingFee } from "@/lib/format";
import type { CartItem, OrderStatus, Product, ProductVariant } from "@/types";
import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";

const productInclude = { category: true, images: true, skus: true } as const;

function cartesianLabels(groups: ProductVariant[]) {
  if (!groups.length) return [] as string[];
  return groups
    .reduce<string[][]>((acc, g) => {
      if (!acc.length) return g.options.map((o) => [o]);
      return acc.flatMap((prefix) => g.options.map((o) => [...prefix, o]));
    }, [])
    .map((p) => p.join(" / "));
}

export async function listCategories() {
  return cachedCategories();
}

const cachedCategories = unstable_cache(
  async () => {
    const rows = await prisma.category.findMany({
      include: { _count: { select: { products: { where: { published: true } } } } },
      orderBy: { name: "asc" },
    });
    return rows.map(toCategory);
  },
  ["categories"],
  { tags: ["catalog"], revalidate: 60 },
);

export async function listProducts(opts?: {
  q?: string;
  cat?: string;
  sort?: string;
  featured?: boolean;
  flashSale?: boolean;
  ids?: string[];
  includeUnpublished?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, opts?.page || 1);
  const pageSize = Math.min(48, Math.max(1, opts?.pageSize || 24));
  const where: Prisma.ProductWhereInput = {
    published: opts?.includeUnpublished ? undefined : true,
  };
  if (opts?.cat) where.category = { slug: opts.cat };
  if (opts?.featured) where.featured = true;
  if (opts?.ids?.length) where.id = { in: opts.ids };
  if (opts?.flashSale) {
    const now = new Date();
    where.flashSale = true;
    where.AND = [
      { OR: [{ flashSaleStartsAt: null }, { flashSaleStartsAt: { lte: now } }] },
      { OR: [{ flashSaleEndsAt: null }, { flashSaleEndsAt: { gte: now } }] },
    ];
  }
  if (opts?.q) {
    const q = opts.q.trim();
    where.OR = [{ name: { contains: q } }, { description: { contains: q } }, { tags: { contains: q } }, { slug: { contains: q } }];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (opts?.sort === "price-asc") orderBy = { price: "asc" };
  if (opts?.sort === "price-desc") orderBy = { price: "desc" };
  if (opts?.sort === "popular") orderBy = { sold: "desc" };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  return { items: rows.map(toProduct), total, page, pageSize, pages: Math.ceil(total / pageSize) };
}

export async function getProductBySlug(slug: string) {
  const row = await prisma.product.findUnique({
    where: { slug },
    include: { ...productInclude, reviews: { orderBy: { createdAt: "desc" } } },
  });
  if (!row) return null;
  return { product: toProduct(row), reviews: row.reviews.map(toReview) };
}

export async function getProductById(id: string) {
  const row = await prisma.product.findUnique({ where: { id }, include: productInclude });
  return row ? toProduct(row) : null;
}

export async function relatedProducts(product: Product, limit = 4) {
  const rows = await prisma.product.findMany({
    where: { published: true, id: { not: product.id }, category: { slug: product.category } },
    include: productInclude,
    take: limit,
  });
  return rows.map(toProduct);
}

export async function listArticles() {
  const rows = await prisma.article.findMany({ orderBy: { date: "desc" } });
  return rows.map(toArticle);
}

export async function getArticle(slug: string) {
  const row = await prisma.article.findUnique({ where: { slug } });
  return row ? { ...toArticle(row), body: row.body } : null;
}

export async function getCoupon(code: string) {
  return prisma.coupon.findFirst({ where: { code: { equals: code.trim() }, active: true } });
}

export async function assertCoupon(code: string, subtotal: number, email?: string, userId?: string) {
  const coupon = await getCoupon(code);
  if (!coupon) throw new Error("Mã không tồn tại");
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new Error("Mã chưa tới hạn dùng");
  if (coupon.endsAt && coupon.endsAt < now) throw new Error("Mã đã hết hạn");
  if (subtotal < coupon.minOrder) throw new Error(`Đơn tối thiểu ${coupon.minOrder}`);
  if (coupon.maxUses != null) {
    const n = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
    if (n >= coupon.maxUses) throw new Error("Mã đã hết lượt");
  }
  if (coupon.maxUsesPerUser != null && (email || userId)) {
    const n = await prisma.couponRedemption.count({
      where: {
        couponId: coupon.id,
        OR: [...(email ? [{ email }] : []), ...(userId ? [{ userId }] : [])],
      },
    });
    if (n >= coupon.maxUsesPerUser) throw new Error("Bạn đã dùng hết lượt mã này");
  }
  return coupon;
}

export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { code: "asc" } });
}

export async function upsertCoupon(data: {
  id?: string;
  code: string;
  type: string;
  value: number;
  minOrder: number;
  active?: boolean;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}) {
  const payload = {
    code: data.code.trim().toUpperCase(),
    type: data.type,
    value: data.value,
    minOrder: data.minOrder,
    active: data.active ?? true,
    maxUses: data.maxUses ?? null,
    maxUsesPerUser: data.maxUsesPerUser ?? null,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
  };
  return data.id
    ? prisma.coupon.update({ where: { id: data.id }, data: payload })
    : prisma.coupon.create({ data: payload });
}

export async function deleteCoupon(id: string) {
  await prisma.coupon.delete({ where: { id } });
}

export async function listOrders(filter?: { email?: string; userId?: string }) {
  const rows = await prisma.order.findMany({
    where:
      filter?.email || filter?.userId
        ? {
            OR: [
              ...(filter.email ? [{ email: filter.email }] : []),
              ...(filter.userId ? [{ userId: filter.userId }] : []),
            ],
          }
        : undefined,
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
  return order;
}

type CheckoutInput = {
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

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const coupon = input.couponCode
    ? await assertCoupon(input.couponCode, subtotal, input.email, input.userId)
    : null;
  const shipRaw = shippingFee(subtotal, { innerCity: input.innerCity });
  const ship = coupon?.type === "shipping" ? 0 : shipRaw;
  const off = coupon
    ? discountAmount(subtotal, {
        type: coupon.type as "percent" | "fixed" | "shipping",
        value: coupon.value,
        minOrder: coupon.minOrder,
      })
    : 0;
  const total = Math.max(0, subtotal + ship - off);

  const pay = await processPayment(input.paymentMethod, { code: "pending", total });
  if (!pay.ok) throw new Error(pay.message);

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
        paymentStatus: pay.paymentStatus,
        status: "pending",
        couponCode: coupon?.code,
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
  return mapped;
}

export async function upsertProduct(data: {
  id?: string;
  slug: string;
  name: string;
  subtitle?: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  tags: string[];
  categorySlug: string;
  stock: number;
  featured?: boolean;
  flashSale?: boolean;
  flashSaleStartsAt?: Date | null;
  flashSaleEndsAt?: Date | null;
  published?: boolean;
  variants?: Product["variants"];
}) {
  const category = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
  if (!category) throw new Error("Danh mục không tồn tại");
  const options = data.variants || [];
  const labels = cartesianLabels(options);
  const payload = {
    slug: data.slug,
    name: data.name,
    subtitle: data.subtitle || "",
    description: data.description,
    price: data.price,
    compareAtPrice: data.compareAtPrice ?? null,
    tags: data.tags.join(","),
    optionsJson: JSON.stringify(options),
    stock: data.stock,
    featured: Boolean(data.featured),
    flashSale: Boolean(data.flashSale),
    flashSaleStartsAt: data.flashSaleStartsAt ?? null,
    flashSaleEndsAt: data.flashSaleEndsAt ?? null,
    published: data.published ?? true,
    categoryId: category.id,
  };

  const row = await prisma.$transaction(async (tx) => {
    const saved = data.id
      ? await tx.product.update({ where: { id: data.id }, data: payload })
      : await tx.product.create({ data: { id: `p-${Date.now()}`, ...payload } });

    await tx.productImage.deleteMany({ where: { productId: saved.id } });
    if (data.images.length) {
      await tx.productImage.createMany({
        data: data.images.map((url, sort) => ({ productId: saved.id, url, sort })),
      });
    }

    if (labels.length) {
      const per = Math.max(1, Math.floor(data.stock / labels.length));
      for (const label of labels) {
        await tx.sku.upsert({
          where: { productId_label: { productId: saved.id, label } },
          create: { productId: saved.id, label, stock: per },
          update: { stock: per },
        });
      }
      await tx.sku.deleteMany({
        where: { productId: saved.id, label: { notIn: labels } },
      });
    }

    return tx.product.findUniqueOrThrow({ where: { id: saved.id }, include: productInclude });
  });

  revalidateTag("catalog", "max");
  return toProduct(row);
}

export async function setProductPublished(id: string, published: boolean) {
  await prisma.product.update({ where: { id }, data: { published } });
  revalidateTag("catalog", "max");
}

export async function deleteProduct(id: string) {
  const used = await prisma.orderItem.count({ where: { productId: id } });
  if (used) {
    await setProductPublished(id, false);
    return { hidden: true };
  }
  await prisma.product.delete({ where: { id } });
  revalidateTag("catalog", "max");
  return { deleted: true };
}

export async function upsertCategory(data: {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
}) {
  const payload = {
    slug: data.slug,
    name: data.name,
    description: data.description || "",
    image: data.image || "",
  };
  const row = data.id
    ? await prisma.category.update({ where: { id: data.id }, data: payload })
    : await prisma.category.create({ data: payload });
  revalidateTag("catalog", "max");
  return toCategory(row);
}

export async function deleteCategory(id: string) {
  const n = await prisma.product.count({ where: { categoryId: id } });
  if (n) throw new Error("Danh mục còn sản phẩm");
  await prisma.category.delete({ where: { id } });
  revalidateTag("catalog", "max");
}

export async function shopStats() {
  const [orderCount, productCount, revenueAgg, lowStock] = await Promise.all([
    prisma.order.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "cancelled" } },
    }),
    prisma.sku.count({ where: { stock: { lt: 5 } } }),
  ]);
  return {
    orderCount,
    productCount,
    revenue: revenueAgg._sum.total ?? 0,
    lowStock,
  };
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

export async function addReview(data: {
  productId: string;
  userId?: string;
  author: string;
  rating: number;
  content: string;
}) {
  if (data.rating < 1 || data.rating > 5) throw new Error("Điểm 1–5");
  if (!data.content.trim()) throw new Error("Nhập nội dung");
  const review = await prisma.review.create({
    data: {
      productId: data.productId,
      userId: data.userId,
      author: data.author,
      rating: data.rating,
      content: data.content.trim(),
    },
  });
  const agg = await prisma.review.aggregate({
    where: { productId: data.productId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: data.productId },
    data: {
      rating: Number((agg._avg.rating || 0).toFixed(1)),
      reviewCount: agg._count,
    },
  });
  return toReview(review);
}

export async function syncCart(userId: string, items: CartItem[]) {
  await prisma.cartLine.deleteMany({ where: { userId } });
  if (!items.length) return;
  await prisma.cartLine.createMany({
    data: items.map((i) => ({
      userId,
      productId: i.productId,
      skuId: i.skuId,
      quantity: i.quantity,
      variantLabel: i.variantLabel || "",
    })),
  });
}

export async function loadCart(userId: string): Promise<CartItem[]> {
  const rows = await prisma.cartLine.findMany({
    where: { userId },
    include: { product: { include: productInclude } },
  });
  return rows.map((r) => {
    const p = toProduct(r.product);
    return {
      productId: p.id,
      slug: p.slug,
      name: p.name,
      image: p.images[0] || "",
      price: p.price,
      quantity: r.quantity,
      variantLabel: r.variantLabel || undefined,
      skuId: r.skuId || undefined,
    };
  });
}

export async function toggleWishlist(userId: string, productId: string) {
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.wishlistItem.create({ data: { userId, productId } });
  return true;
}

export async function listWishlistIds(userId: string) {
  const rows = await prisma.wishlistItem.findMany({ where: { userId } });
  return rows.map((r) => r.productId);
}
