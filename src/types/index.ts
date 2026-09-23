export type ProductVariant = {
  id: string;
  name: string;
  options: string[];
};

export type ProductSku = {
  id: string;
  label: string;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  sold: number;
  featured?: boolean;
  flashSale?: boolean;
  flashSaleStartsAt?: string;
  flashSaleEndsAt?: string;
  published?: boolean;
  variants?: ProductVariant[];
  skus?: ProductSku[];
  attrs?: Record<string, string>;
  unit?: "cai" | "kg";
  weightGrams?: number;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variantLabel?: string;
  skuId?: string;
  unit?: "cai" | "kg";
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "completed"
  | "cancelled";

export type Order = {
  id: string;
  code: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus?: string;
  ghnOrderCode?: string;
  couponCode?: string;
  bundleCode?: string;
  status: OrderStatus;
  createdAt: string;
  note?: string;
  pointsUsed?: number;
  pointsEarned?: number;
};

export type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  content: string;
  createdAt: string;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  date: string;
  minutes: number;
};

export type UserSession = {
  name: string;
  email: string;
  role: "customer" | "admin";
  points?: number;
  memberTier?: string;
};

export function lineAmount(price: number, quantity: number, unit?: string) {
  if (unit === "kg") return Math.round((price * quantity) / 1000);
  return price * quantity;
}
