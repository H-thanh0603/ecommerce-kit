import { expect, test } from "@playwright/test";
import { ensureE2EProduct, unpublishProduct } from "./helpers";

test.beforeEach(async ({ page }) => {
  // Chặn ảnh remote cho test nhẹ, không phụ thuộc mạng Unsplash.
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
});

/** Luồng mua hàng: SP test riêng → thêm giỏ → checkout COD → có mã đơn. */
test("khach dat hang COD thanh cong", async ({ page }) => {
  const product = await ensureE2EProduct(page, "cod");

  await page.goto(`/san-pham/${product.slug}`);
  await page.getByRole("button", { name: "Thêm vào giỏ" }).first().click();
  // Chờ localStorage (nguồn thật của giỏ), không chờ message vì nó tự ẩn sau 1.8s.
  await page.waitForFunction(() => (localStorage.getItem("atelier.cart.v1") || "[]") !== "[]", { timeout: 10_000 });

  await page.goto("/gio-hang");
  await expect(page.getByText("Tổng").first()).toBeVisible();

  await page.goto("/thanh-toan");
  const email = `e2e${Date.now()}@kit.vn`;
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Đặt hàng" }) });
  await form.getByPlaceholder("Họ tên").fill("E2E Tester");
  await form.getByPlaceholder("Số điện thoại").fill("0900000000");
  await form.getByPlaceholder("Email", { exact: true }).fill(email);
  await form.getByPlaceholder("Địa chỉ").fill("1 E2E, Q1");
  await page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(page).toHaveURL(/dat-hang-thanh-cong/, { timeout: 20_000 });
  await expect(page.getByText(/ATL-\d{5}/)).toBeVisible();

  await unpublishProduct(page, product);
});

test("tim kiem khong dau ra san pham", async ({ page }) => {
  await page.goto("/san-pham?q=ao+linen");
  await expect(page.locator('a[href^="/san-pham/"]').first()).toBeVisible();
});
