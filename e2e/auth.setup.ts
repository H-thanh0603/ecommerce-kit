import { expect, test as setup } from "@playwright/test";

const AUTH_FILE = "e2e/.auth/admin.json";

/** Đăng nhập 1 lần cho cả suite — tránh đụng rate-limit login khi chạy dồn. */
setup("dang nhap admin", async ({ page }) => {
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
  await page.goto("/dang-nhap");
  const form = page.locator("form").filter({ has: page.getByPlaceholder("Mật khẩu") });
  await form.getByPlaceholder("Email").fill(process.env.ADMIN_EMAIL || "admin@atelier.vn");
  await form.getByPlaceholder("Mật khẩu").fill(process.env.ADMIN_PASSWORD || "admin123");
  await form.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/admin|\/tai-khoan/, { timeout: 15_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
