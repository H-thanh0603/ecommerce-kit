import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
});

/** Admin đăng nhập → thấy dashboard và danh sách đơn. */
test("admin dang nhap va xem don", async ({ page }) => {
  await page.goto("/dang-nhap");
  const form = page.locator("form").filter({ has: page.getByPlaceholder("Mật khẩu") });
  await form.getByPlaceholder("Email").fill(process.env.ADMIN_EMAIL || "admin@atelier.vn");
  await page.getByPlaceholder("Mật khẩu").fill(process.env.ADMIN_PASSWORD || "admin123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/admin|\/tai-khoan/, { timeout: 15_000 });
  await page.goto("/admin/don-hang");
  await expect(page.getByRole("heading", { name: "Đơn hàng" })).toBeVisible();
});
