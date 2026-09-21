import { prisma } from "@/server/db";
import { toArticle, toCategory, toProduct, toReview } from "@/server/map";
import { normVi } from "@/lib/format";
import type { Prisma } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import type { Product, ProductVariant } from "@/types";

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
  const pageSize = opts?.ids?.length
    ? Math.max(opts.ids.length, 1)
    : Math.min(48, Math.max(1, opts?.pageSize || 24));
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
    const q = normVi(opts.q);
    where.OR = [{ searchText: { contains: q } }, { slug: { contains: opts.q.trim() } }];
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
    include: {
      ...productInclude,
      reviews: { where: { status: "approved" }, orderBy: { createdAt: "desc" } },
    },
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

export async function addReview(data: {
  productId: string;
  userId?: string;
  author: string;
  rating: number;
  content: string;
}) {
  if (data.rating < 1 || data.rating > 5) throw new Error("Điểm 1–5");
  if (!data.content.trim()) throw new Error("Nhập nội dung");
  // Đánh giá mới chờ duyệt — chỉ hiện sau khi admin bấm Duyệt.
  const review = await prisma.review.create({
    data: {
      productId: data.productId,
      userId: data.userId,
      author: data.author,
      rating: data.rating,
      content: data.content.trim(),
      status: "pending",
    },
  });
  const agg = await prisma.review.aggregate({
    where: { productId: data.productId, status: "approved" },
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

export async function listPendingReviews() {
  return prisma.review.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true } } },
  });
}

export async function approveReview(id: string) {
  const review = await prisma.review.update({ where: { id }, data: { status: "approved" } });
  const agg = await prisma.review.aggregate({
    where: { productId: review.productId, status: "approved" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: review.productId },
    data: { rating: Number((agg._avg.rating || 0).toFixed(1)), reviewCount: agg._count },
  });
  return toReview(review);
}

export async function deleteReview(id: string) {
  const review = await prisma.review.delete({ where: { id } });
  const agg = await prisma.review.aggregate({
    where: { productId: review.productId, status: "approved" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: review.productId },
    data: { rating: Number((agg._avg.rating || 0).toFixed(1)), reviewCount: agg._count },
  });
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
  unit?: "cai" | "kg";
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
    searchText: normVi([data.name, data.subtitle || "", data.description, data.tags.join(" ")].join(" ")),
    optionsJson: JSON.stringify(options),
    stock: data.stock,
    featured: Boolean(data.featured),
    flashSale: Boolean(data.flashSale),
    flashSaleStartsAt: data.flashSaleStartsAt ?? null,
    flashSaleEndsAt: data.flashSaleEndsAt ?? null,
    published: data.published ?? true,
    unit: data.unit || "cai",
    categoryId: category.id,
  };

  const row = await prisma.$transaction(async (tx) => {
    const saved = data.id
      ? await tx.product.update({ where: { id: data.id }, data: payload })
      : await tx.product.create({ data: { id: `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, ...payload } });

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
  // Đồng bộ dòng tồn kho còn thiếu cho kho mặc định (không chặn lưu SP nếu kho lỗi).
  try {
    const { ensureWarehouseStock } = await import("@/server/warehouse");
    await ensureWarehouseStock(row.id);
  } catch {
    /* bỏ qua */
  }
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
