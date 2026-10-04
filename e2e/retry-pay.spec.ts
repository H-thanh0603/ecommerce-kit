import { expect, test } from "@playwright/test";
import { ensureE2EProduct, unpublishProduct, type E2EProduct } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com|plus\.unsplash\.com/, (r) => r.abort());
});

// Rate limit checkout là bucket in-memory key theo IP — test API dùng IP riêng
// để không chặn các spec UI khác trong cùng suite (server tin x-real-ip khi TRUSTED_PROXY trống).
const ISOLATED_IP = { "x-real-ip": "203.0.113.20" };

function orderPayload(product: E2EProduct, email: string, clientRequestId: string) {
  return {
    customer: "E2E Retry",
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

/** Idempotency double-POST (1 đơn duy nhất) + retry-pay tự chặn đơn COD/id lạ. */
test("idempotency clientRequestId + retry-pay tu choi don COD", async ({ page }) => {
  const product = await ensureE2EProduct(page, "idem");
  const rid = `e2e-${Date.now()}-idem`;
  const email = `e2e-idem${Date.now()}@kit.vn`;
  try {
    const r1 = await page.request.post("/api/orders", {
      headers: ISOLATED_IP,
      data: orderPayload(product, email, rid),
    });
    expect(r1.ok()).toBe(true);
    const d1 = await r1.json();
    expect(d1.idempotent).toBeUndefined();

    const r2 = await page.request.post("/api/orders", {
      headers: ISOLATED_IP,
      data: orderPayload(product, email, rid),
    });
    expect(r2.ok()).toBe(true);
    const d2 = await r2.json();
    expect(d2.idempotent).toBe(true);
    expect(d2.order.code).toBe(d1.order.code);
    expect(d2.order.total).toBe(d1.order.total);

    // Đơn COD → retry-pay trả 400, không dựng payUrl
    const retry = await page.request.post(`/api/orders/${d1.order.id}/retry-pay`, {
      headers: ISOLATED_IP,
      data: { email },
    });
    expect(retry.status()).toBe(400);
    const retryBody = await retry.json();
    expect(retryBody.message).toMatch(/thanh toán lại/);

    // Id không tồn tại → 404 (route trả 404 như không tồn tại)
    const missing = await page.request.post(`/api/orders/000000000000000000000000/retry-pay`, {
      headers: ISOLATED_IP,
      data: {},
    });
    expect(missing.status()).toBe(404);
  } finally {
    await unpublishProduct(page, product);
  }
});
