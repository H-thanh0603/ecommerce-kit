import type { Article, CartItem, Category, Order, Product, ProductVariant, Review } from "@/types";
import { isFlashLive } from "@/lib/format";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  tags: string;
  optionsJson: string;
  rating: number;
  reviewCount: number;
  stock: number;
  sold: number;
  featured: boolean;
  flashSale: boolean;
  flashSaleStartsAt: Date | null;
  flashSaleEndsAt: Date | null;
  published: boolean;
  category: { slug: string };
  images?: { url: string; sort: number }[];
  skus?: { id: string; label: string; stock: number }[];
};

export function toProduct(row: ProductRow): Product {
  const variants = parseJson<ProductVariant[]>(row.optionsJson, []);
  const skuStock = row.skus?.reduce((s, k) => s + k.stock, 0);
  const flash = {
    flashSale: row.flashSale,
    flashSaleStartsAt: row.flashSaleStartsAt,
    flashSaleEndsAt: row.flashSaleEndsAt,
  };
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle || undefined,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compareAtPrice ?? undefined,
    images: (row.images || []).slice().sort((a, b) => a.sort - b.sort).map((i) => i.url),
    category: row.category.slug,
    tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    rating: row.rating,
    reviewCount: row.reviewCount,
    stock: skuStock ?? row.stock,
    sold: row.sold,
    featured: row.featured,
    flashSale: isFlashLive(flash),
    flashSaleStartsAt: row.flashSaleStartsAt?.toISOString(),
    flashSaleEndsAt: row.flashSaleEndsAt?.toISOString(),
    published: row.published,
    variants: variants.length ? variants : undefined,
    skus: row.skus,
  };
}

export function toCategory(row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  _count?: { products: number };
}): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    image: row.image,
    productCount: row._count?.products ?? 0,
  };
}

export function toReview(row: {
  id: string;
  productId: string;
  author: string;
  rating: number;
  content: string;
  createdAt: Date;
}): Review {
  return {
    id: row.id,
    productId: row.productId,
    author: row.author,
    rating: row.rating,
    content: row.content,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

export function toArticle(row: {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  date: string;
  minutes: number;
}): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover: row.cover,
    date: row.date,
    minutes: row.minutes,
  };
}

export function toOrder(row: {
  id: string;
  code: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  note: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: Date;
  items: Array<{
    productId: string;
    slug: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    variantLabel: string;
    skuId?: string | null;
  }>;
}): Order {
  return {
    id: row.id,
    code: row.code,
    customer: row.customer,
    email: row.email,
    phone: row.phone,
    address: row.address,
    note: row.note || undefined,
    items: row.items.map(
      (i): CartItem => ({
        productId: i.productId,
        slug: i.slug,
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
        variantLabel: i.variantLabel || undefined,
        skuId: i.skuId || undefined,
      }),
    ),
    subtotal: row.subtotal,
    shippingFee: row.shippingFee,
    discount: row.discount,
    total: row.total,
    paymentMethod: row.paymentMethod,
    status: row.status as Order["status"],
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}
