import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Chặn ảnh remote cho test nhẹ, không phụ thuộc mạng Unsplash.
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
});

/** Luồng mua hàng của khách vãng lai: xem → thêm giỏ → checkout COD → có mã đơn. */
test("khach dat hang COD thanh cong", async ({ page }) => {
  await page.goto("/san-pham");
  const hrefs: string[] = [];
  for (const a of await page.locator('a[href^="/san-pham/"]').all()) {
    const h = await a.getAttribute("href");
    if (h && !hrefs.includes(h)) hrefs.push(h);
  }
  expect(hrefs.length).toBeGreaterThan(0);

  // Chọn SP còn tồn (seed/test có thể đã ăn hết tồn vài SP đầu).
  // Chờ localStorage (nguồn thật của giỏ), không chờ message vì nó tự ẩn sau 1.8s.
  let added = false;
  for (const href of hrefs.slice(0, 8)) {
    await page.goto(href);
    await page.getByRole("button", { name: "Thêm vào giỏ" }).first().click();
    added = await page
      .waitForFunction(() => (localStorage.getItem("atelier.cart.v1") || "[]") !== "[]", { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (added) break;
  }
  expect(added).toBe(true);

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
});

test("tim kiem khong dau ra san pham", async ({ page }) => {
  await page.goto("/san-pham?q=ao+linen");
  await expect(page.locator('a[href^="/san-pham/"]').first()).toBeVisible();
});
