import { expect, test } from "@playwright/test";
import { ensureE2EProduct, unpublishProduct } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
});

/** Gift card: phát hành qua API → dùng ở checkout UI → số dư giảm. */
test("gift card giam gia don hang", async ({ page }) => {
  const code = `E2EG${Date.now()}`.slice(0, 14);
  const created = await page.request.post("/api/admin/gifts", { data: { code, balance: 200_000 } });
  expect(created.ok()).toBe(true);

  // Mua SP test riêng (không ăn tồn thật).
  const product = await ensureE2EProduct(page, "gift");
  await page.goto(`/san-pham/${product.slug}`);
  await page.getByRole("button", { name: "Thêm vào giỏ" }).first().click();
  await page.waitForFunction(() => (localStorage.getItem("atelier.cart.v1") || "[]") !== "[]", { timeout: 10_000 });

  await page.goto("/thanh-toan");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Đặt hàng" }) });
  await form.getByPlaceholder("Họ tên").fill("E2E Gift");
  await form.getByPlaceholder("Số điện thoại").fill("0900000000");
  await form.getByPlaceholder("Email", { exact: true }).fill(`gift${Date.now()}@kit.vn`);
  await form.getByPlaceholder("Địa chỉ").fill("1 E2E, Q1");
  await form.getByPlaceholder("Thẻ quà tặng (nếu có)").fill(code);
  await form.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(page).toHaveURL(/dat-hang-thanh-cong/, { timeout: 20_000 });

  const list = await page.request.get("/api/admin/gifts").then((r) => r.json());
  const g = (list.gifts as Array<{ code: string; balance: number }>).find((x) => x.code === code);
  expect(g).toBeTruthy();
  expect(g!.balance).toBeLessThan(200_000);

  await unpublishProduct(page, product);
});

/** Returns: đặt đơn qua API → gửi yêu cầu trả → admin duyệt → vào danh sách đã hoàn tồn. */
test("returns duyet hoan ton", async ({ page }) => {
  const email = `rete2e${Date.now()}@kit.vn`;
  const created = await page.request.post("/api/orders", {
    data: {
      customer: "E2E Return",
      email,
      phone: "0900000000",
      address: "1 E2E, Q1",
      paymentMethod: "cod",
      items: [{ productId: "p3", slug: "tui-canvas", name: "Túi", image: "", price: 1, quantity: 1 }],
    },
  });
  // p3 giá thật ở DB, price client bị bỏ qua — đơn vẫn tạo được nếu còn tồn.
  expect(created.ok()).toBe(true);
  const orderCode = (await created.json()).order.code as string;

  const ret = await page.request.post("/api/returns", {
    data: { orderCode, email, items: [{ productId: "p3", quantity: 1 }], reason: "E2E doi y" },
  });
  expect(ret.ok()).toBe(true);

  await page.goto("/admin/tra-hang");
  await page.locator("article", { hasText: orderCode }).getByRole("button", { name: "Duyệt + hoàn tồn" }).click();
  await page.getByRole("button", { name: "Đã hoàn tồn" }).click();
  await expect(page.locator("article", { hasText: orderCode })).toBeVisible({ timeout: 10_000 });
});

/** Webhook: thêm endpoint qua UI → ping → có kết quả. */
test("webhook them va ping", async ({ page }) => {
  await page.goto("/admin/webhooks");
  const url = `http://127.0.0.1:9/e2e${Date.now()}`;
  await page.getByPlaceholder("https://…").fill(url);
  await page.getByRole("button", { name: "Thêm", exact: true }).click();
  await expect(page.getByText("Đã thêm")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Ping tất cả" }).click();
  await expect(page.getByText(/Ping:/)).toBeVisible({ timeout: 20_000 });
  await page.locator("li", { hasText: url }).getByRole("button", { name: "Xóa" }).click();
});
