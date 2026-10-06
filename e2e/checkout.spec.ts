import { expect, test } from "@playwright/test";
import { ensureE2EProduct, unpublishProduct, type E2EProduct } from "./helpers";

test.beforeEach(async ({ page }) => {
  // Chặn ảnh remote cho test nhẹ, không phụ thuộc mạng Unsplash.
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
  // POST /api/orders của test này dùng IP riêng — không đội hàng với spec khác
  // trong bucket rate-limit in-memory của server (10 POST/phút/IP).
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const headers = { ...route.request().headers(), "x-real-ip": "203.0.113.10" };
    return route.continue({ headers });
  });
});

async function stockOf(page: import("@playwright/test").Page, id: string): Promise<number> {
  const res = await page.request.get(`/api/products?ids=${id}`);
  expect(res.ok()).toBe(true);
  const data = await res.json();
  return data.products[0].stock as number;
}

function orderPayload(product: E2EProduct, email: string, clientRequestId?: string) {
  return {
    customer: "E2E Tester",
    email,
    phone: "0900000000",
    address: "1 E2E, Q1",
    paymentMethod: "cod",
    clientRequestId,
    items: [
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0] || "",
        price: product.price,
        quantity: 1,
      },
    ],
  };
}

/** Luồng COD đầy đủ: tồn giảm đúng 1, admin đẩy đơn lên hoàn tất qua UI. */
test("checkout COD: tru ton dung 1 + admin danh dau hoan tat", async ({ page }) => {
  const product = await ensureE2EProduct(page, "fullflow");
  const stockBefore = await stockOf(page, product.id);

  await page.goto(`/san-pham/${product.slug}`);
  await page.getByRole("button", { name: "Thêm vào giỏ" }).first().click();
  await page.waitForFunction(() => (localStorage.getItem("atelier.cart.v1") || "[]") !== "[]", { timeout: 10_000 });

  await page.goto("/thanh-toan");
  const email = `e2e-full${Date.now()}@kit.vn`;
  await page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(page).toHaveURL(/dat-hang-thanh-cong/, { timeout: 20_000 });
  const codeEl = page.getByText(/EK-[A-Z0-9]{8}/).first();
  const code = await codeEl.textContent();
  expect(code).toMatch(/EK-[A-Z0-9]{8}/);

  // Tồn kho giảm đúng 1 sau khi đặt
  expect(await stockOf(page, product.id)).toBe(stockBefore - 1);

  // Admin đẩy đơn lên hoàn tất qua UI admin — đi đúng state machine: shipping → completed
  await page.goto(`/admin/don-hang?q=${code!.trim()}`);
  const card = page.locator("article", { has: page.getByText(code!.trim()) }).first();
  await expect(card).toBeVisible();
  await card.getByLabel("Trạng thái đơn").selectOption("shipping");
  await expect(page.getByRole("status").filter({ hasText: "Đang giao" })).toBeVisible({ timeout: 15_000 });
  await card.getByLabel("Trạng thái đơn").selectOption("completed");
  await expect(page.getByRole("status").filter({ hasText: "Hoàn tất" })).toBeVisible({ timeout: 15_000 });

  await unpublishProduct(page, product);
});
