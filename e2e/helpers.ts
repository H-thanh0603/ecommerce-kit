import { expect, type Page } from "@playwright/test";

export type E2EProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  tags: string[];
  category: string;
  stock: number;
};

/** Tạo SP riêng cho test (tồn 50), xong thì gọi unpublishProduct để dọn storefront. */
export async function ensureE2EProduct(page: Page, tag: string): Promise<E2EProduct> {
  const slug = `e2e-${tag}-${Date.now()}`;
  const res = await page.request.post("/api/products", {
    data: {
      slug,
      name: `E2E ${tag}`,
      description: "Sản phẩm test tự động",
      price: 99_000,
      images: [],
      tags: ["e2e"],
      categorySlug: "thoi-trang",
      stock: 50,
    },
  });
  expect(res.ok()).toBe(true);
  return (await res.json()).product as E2EProduct;
}

export async function unpublishProduct(page: Page, p: E2EProduct) {
  await page.request.patch(`/api/products/${p.id}`, {
    data: {
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      images: p.images,
      tags: p.tags,
      categorySlug: p.category,
      stock: p.stock,
      published: false,
    },
  });
}
