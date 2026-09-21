import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
});

/** Session admin từ setup project còn hiệu lực → vào thẳng trang đơn. */
test("admin dang nhap va xem don", async ({ page }) => {
  await page.goto("/admin/don-hang");
  await expect(page.getByRole("heading", { name: "Đơn hàng" })).toBeVisible();
});
