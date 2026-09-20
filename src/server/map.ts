import type { Article, CartItem, Category, Order, Product, ProductVariant, Review } from "@/types";

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
  imagesJson: string;
  tagsJson: string;
  variantsJson: string;
  rating: number;
  reviewCount: number;
  stock: number;
  sold: number;
  featured: boolean;
  flashSale: boolean;
  category: { slug: string };
};

export function toProduct(row: ProductRow): Product {
  const variants = parseJson<ProductVariant[]>(row.variantsJson, []);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle || undefined,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compareAtPrice ?? undefined,
    images: parseJson<string[]>(row.imagesJson, []),
    category: row.category.slug,
    tags: parseJson<string[]>(row.tagsJson, []),
    rating: row.rating,
    reviewCount: row.reviewCount,
    stock: row.stock,
    sold: row.sold,
    featured: row.featured,
    flashSale: row.flashSale,
    variants: variants.length ? variants : undefined,
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
