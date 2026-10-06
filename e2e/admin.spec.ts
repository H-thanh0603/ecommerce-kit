import { expect, test } from "@playwright/test";
import { ensureE2EProduct, unpublishProduct } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
});

/** Session admin từ setup project còn hiệu lực → vào thẳng trang đơn. */
test("admin dang nhap va xem don", async ({ page }) => {
  await page.goto("/admin/don-hang");
  await expect(page.getByRole("heading", { name: "Đơn hàng" })).toBeVisible();
});

/** Command palette ⌘K: mở bằng Ctrl+K, gõ để lọc điều hướng, Enter chuyển trang. */
test("palette mo bang ctrl+k va dieu huong", async ({ page }) => {
  await page.goto("/admin");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Tìm nhanh admin" });
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder(/Tìm trang/).fill("khách");
  await dialog.getByRole("option", { name: "Khách hàng" }).click();
  await expect(page).toHaveURL(/\/admin\/khach-hang$/);
});

/** Saved view: lưu bộ lọc URL → reload còn → bấm chip về đúng URL → xóa được. */
test("saved view luu va mo lai bo loc", async ({ page }) => {
  // Xóa view có confirm() — Playwright mặc định dismiss → phải accept tay.
  page.on("dialog", (d) => d.accept());

  await page.goto("/admin/don-hang?status=pending");
  await page.getByRole("button", { name: "+ Lưu bộ lọc hiện tại" }).click();
  await page.getByRole("textbox", { name: "Tên bộ lọc" }).fill(`E2E chờ`);
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  const chip = page.getByRole("button", { name: "E2E chờ", exact: true });
  await expect(chip).toBeVisible();

  // Reload — view per-user phải còn.
  await page.reload();
  await expect(page.getByRole("button", { name: "E2E chờ", exact: true })).toBeVisible();

  // Bấm chip → về đúng bộ lọc.
  await page.getByRole("button", { name: "E2E chờ", exact: true }).click();
  await expect(page).toHaveURL(/status=pending/);

  // Dọn dẹp (idempotent cho lần chạy sau).
  await page.getByRole("button", { name: "Xóa bộ lọc E2E chờ" }).click();
  await expect(page.getByRole("button", { name: "E2E chờ", exact: true })).toHaveCount(0);
});

/** Side panel: ?order=<id> mở panel; đóng (Esc) giữ nguyên filter phía sau. */
test("order panel mo dong giu bo loc", async ({ page }) => {
  const product = await ensureE2EProduct(page, "panel");
  const order = await page.request
    .post("/api/orders", {
      data: {
        customer: "E2E Panel",
        email: `panel${Date.now()}@kit.vn`,
        phone: "0900000001",
        address: "1 E2E Panel, Q1",
        paymentMethod: "cod",
        clientRequestId: `e2e-panel-${Date.now()}`,
        items: [
          { productId: product.id, slug: product.slug, name: product.name, image: "", price: product.price, quantity: 1 },
        ],
      },
    })
    .then((r) => r.json());
  expect(order.order?.id).toBeTruthy();

  await page.goto(`/admin/don-hang?status=pending`);
  const detail = page.getByRole("link", { name: "Chi tiết →" }).first();
  await detail.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(order.order.code);
  await expect(dialog).toContainText(product.name);

  // Esc đóng panel — filter status=pending phải còn nguyên trong URL (UI-011).
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/status=pending/);
  await expect(page).not.toHaveURL(/order=/);

  // Dọn dẹp: huỷ đơn (hoàn tồn) + ẩn SP test.
  await page.request.patch(`/api/orders/${order.order.id}`, { data: { status: "cancelled" } });
  await unpublishProduct(page, product);
});
