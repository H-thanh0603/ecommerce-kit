import type { Prisma } from "@prisma/client";

/** Include dùng chung cho Product — đổi 1 chỗ, cả catalog/cart/order cùng hưởng. */
export const productInclude = {
  category: true,
  images: true,
  skus: true,
} satisfies Prisma.ProductInclude;
