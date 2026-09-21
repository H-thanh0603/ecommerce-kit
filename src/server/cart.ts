import { prisma } from "@/server/db";
import { toProduct } from "@/server/map";
import { productInclude } from "@/server/product-include";
import type { CartItem } from "@/types";

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
