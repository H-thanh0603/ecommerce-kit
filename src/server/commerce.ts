import { prisma } from "@/server/db";
import { toArticle, toCategory, toOrder, toProduct, toReview } from "@/server/map";
import { processPayment } from "@/server/payments";
import { discountAmount, shippingFee } from "@/lib/format";
import type { CartItem, OrderStatus, Product } from "@/types";
import type { Prisma } from "@prisma/client";

const productInclude = { category: true } as const;

export async function listCategories() {
  const rows = await prisma.category.findMany({
    include: { _count: { select: { products: { where: { published: true } } } } },
    orderBy: { name: "asc" },
  });
  return rows.map(toCategory);
}

export async function listProducts(opts?: {
  q?: string;
  cat?: string;
  sort?: string;
  featured?: boolean;
  flashSale?: boolean;
  ids?: string[];
  includeUnpublished?: boolean;
}) {
  const where: Prisma.ProductWhereInput = {
    published: opts?.includeUnpublished ? undefined : true,
  };
  if (opts?.cat) where.category = { slug: opts.cat };
  if (opts?.featured) where.featured = true;
  if (opts?.flashSale) where.flashSale = true;
  if (opts?.ids?.length) where.id = { in: opts.ids };
  if (opts?.q) {
    const q = opts.q.trim();
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { tagsJson: { contains: q } },
    ];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (opts?.sort === "price-asc") orderBy = { price: "asc" };
  if (opts?.sort === "price-desc") orderBy = { price: "desc" };
  if (opts?.sort === "popular") orderBy = { sold: "desc" };

  const rows = await prisma.product.findMany({ where, include: productInclude, orderBy });
  return rows.map(toProduct);
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

export async function listReviews(productId: string) {
  const rows = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toReview);
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
  return prisma.coupon.findFirst({
    where: { code: { equals: code.trim() }, active: true },
  });
}

export async function listOrders(filter?: { email?: string; userId?: string }) {
  const rows = await prisma.order.findMany({
    where: filter?.email || filter?.userId
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
  return toOrder(row);
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
};

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
    if (p.stock < item.quantity) throw new Error(`Không đủ tồn: ${p.name}`);
    return {
      product: p,
      quantity: item.quantity,
      variantLabel: item.variantLabel || "",
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  let coupon = null;
  if (input.couponCode) coupon = await getCoupon(input.couponCode);
  const shipRaw = shippingFee(subtotal);
  const ship = coupon?.type === "shipping" ? 0 : shipRaw;
  const off = coupon
    ? discountAmount(subtotal, { type: coupon.type as "percent" | "fixed" | "shipping", value: coupon.value, minOrder: coupon.minOrder })
    : 0;
  const total = Math.max(0, subtotal + ship - off);
  const code = "ATL-" + Math.floor(10000 + Math.random() * 89999);

  const pay = await processPayment(input.paymentMethod, { code, total });
  if (!pay.ok) throw new Error(pay.message);

  const order = await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const updated = await tx.product.updateMany({
        where: { id: line.product.id, stock: { gte: line.quantity } },
        data: {
          stock: { decrement: line.quantity },
          sold: { increment: line.quantity },
          updatedAt: new Date(),
        },
      });
      if (updated.count !== 1) throw new Error(`Không đủ tồn: ${line.product.name}`);
    }

    return tx.order.create({
      data: {
        code,
        userId: input.userId,
        customer: input.customer,
        email: input.email,
        phone: input.phone,
        address: input.address,
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
            slug: l.product.slug,
            name: l.product.name,
            image: JSON.parse(l.product.imagesJson)[0] || "",
            price: l.product.price,
            quantity: l.quantity,
            variantLabel: l.variantLabel,
          })),
        },
      },
      include: { items: true },
    });
  });

  return toOrder(order);
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
  published?: boolean;
  variants?: Product["variants"];
}) {
  const category = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
  if (!category) throw new Error("Danh mục không tồn tại");
  const payload = {
    slug: data.slug,
    name: data.name,
    subtitle: data.subtitle || "",
    description: data.description,
    price: data.price,
    compareAtPrice: data.compareAtPrice ?? null,
    imagesJson: JSON.stringify(data.images),
    tagsJson: JSON.stringify(data.tags),
    variantsJson: JSON.stringify(data.variants || []),
    stock: data.stock,
    featured: Boolean(data.featured),
    flashSale: Boolean(data.flashSale),
    published: data.published ?? true,
    categoryId: category.id,
  };
  const row = data.id
    ? await prisma.product.update({ where: { id: data.id }, data: payload, include: productInclude })
    : await prisma.product.create({
        data: { id: `p-${Date.now()}`, ...payload },
        include: productInclude,
      });
  return toProduct(row);
}

export async function shopStats() {
  const [orderCount, productCount, revenueAgg, lowStock] = await Promise.all([
    prisma.order.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: "cancelled" } },
    }),
    prisma.product.count({ where: { stock: { lt: 15 } } }),
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
