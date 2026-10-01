import { expect, test } from "@playwright/test";
import { ensureE2EProduct, unpublishProduct } from "./helpers";

test.beforeEach(async ({ page }) => {
  // Chặn ảnh remote cho test nhẹ, không phụ thuộc mạng Unsplash.
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
});

/** Filter giá: chỉ SP trong khoảng hiển thị, có đường xoá lọc. */
test("loc gia chi hien san pham trong khoang", async ({ page }) => {
  // SP seed ổn định: Sữa rửa mặt tràm trà 210.000 ₫; Thảm len nhỏ 80x120 1.290.000 ₫.
  await page.goto("/san-pham?min=200000&max=800000");
  await expect(page.getByText("Sữa rửa mặt tràm trà")).toBeVisible();
  await expect(page.getByText("Thảm len nhỏ 80x120")).toBeHidden();
  await expect(page.getByRole("link", { name: "Xoá lọc" })).toBeVisible();
});

/** Gợi ý tìm kiếm: gõ ≥2 ký tự → dropdown có SP khớp. */
test("goi y tim kiem hien dropdown", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("#d-search");
  await input.fill("gốm");
  const box = page.getByRole("listbox");
  await expect(box.getByText("Bộ chén gốm 4 cái")).toBeVisible({ timeout: 10_000 });
  await expect(box.getByText(/Xem tất cả kết quả/)).toBeVisible();
});

/** Sticky buy bar mobile: Mua ngay → thêm giỏ + sang trang thanh toán. */
test("sticky bar mobile mua ngay ve thanh toan", async ({ page }) => {
  // Chốt sẵn lựa chọn cookie để banner consent không che sticky bar
  await page.addInitScript(() => localStorage.setItem("ek.consent.v1", "accepted"));
  const product = await ensureE2EProduct(page, "sticky");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/san-pham/${product.slug}`);
  await page.getByRole("button", { name: "Mua ngay" }).click();
  await expect(page).toHaveURL(/thanh-toan/, { timeout: 20_000 });
  await unpublishProduct(page, product);
});
