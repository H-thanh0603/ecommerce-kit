import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Session + cổng VietQR điều khiển được — route đọc từ module này.
const mockState = vi.hoisted(() => ({
  session: null as null | { id: string; name: string; email: string; role: "customer" | "admin" },
  checkResult: { ok: true, paid: false, message: "Chưa thấy giao dịch" } as {
    ok: boolean;
    paid?: boolean;
    message?: string;
  },
}));
vi.mock("@/server/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/server/auth")>();
  return { ...mod, getSession: async () => mockState.session };
});
vi.mock("@/server/vietqr", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/server/vietqr")>();
  return { ...mod, checkVietqrTransaction: async () => mockState.checkResult };
});
vi.mock("@/server/webhooks", () => ({ dispatchWebhooks: async () => {} }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({}),
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

import { POST } from "./route";
import { prisma } from "@/server/db";
import { createOrder, getProductById } from "@/server/commerce";

// SP riêng p9 cho file này (p1-p8 đã có chủ — xem AGENTS.md về song song test).
const PID = "p9";

function checkReq(body: unknown) {
  return new Request("http://localhost/api/payments/vietqr/check", {
    method: "POST",
    headers: { host: "localhost", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("vietqr/check chống IDOR", () => {
  const emails: string[] = [];
  const orderIds: string[] = [];

  beforeEach(() => {
    mockState.session = null;
    mockState.checkResult = { ok: true, paid: false, message: "Chưa thấy giao dịch" };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    mockState.session = null;
    for (const id of orderIds) {
      await prisma.orderEvent.deleteMany({ where: { orderId: id } });
      await prisma.order.deleteMany({ where: { id } }).catch(() => {});
    }
    orderIds.length = 0;
  });

  async function makeOrder(email: string, userId?: string) {
    emails.push(email);
    const before = await getProductById(PID);
    await prisma.product.update({ where: { id: PID }, data: { stock: 10 } });
    const order = await createOrder({
      customer: "Khách VietQR",
      email,
      phone: "0900000000",
      address: "1 Test, Q1",
      paymentMethod: "vietqr",
      userId,
      items: [
        {
          productId: PID,
          slug: before!.slug,
          name: before!.name,
          image: before!.images[0] || "",
          price: before!.price,
          quantity: 1,
          variantLabel: "",
        },
      ],
    });
    orderIds.push(order.id);
    return order;
  }

  it("guest đúng email → được dò giao dịch; sai email → 404 như đơn không tồn tại", async () => {
    const order = await makeOrder(`vq-ok-${Date.now()}@kit.vn`);

    // Email lệch — trả 404 (không lộ đơn tồn tại), không gọi cổng.
    const wrong = await POST(checkReq({ code: order.code, email: "khac@kit.vn" }));
    expect(wrong.status).toBe(404);

    // Đúng email → route gọi cổng (mock) → chưa thấy giao dịch nhưng được phép dò.
    const right = await POST(checkReq({ code: order.code, email: emails[emails.length - 1] }));
    expect(right.status).toBe(200);
    const data = await right.json();
    expect(data.paid).toBeFalsy();
  });

  it("thấy giao dịch → chốt paid đúng 1 lần (guard not-paid)", async () => {
    const order = await makeOrder(`vq-paid-${Date.now()}@kit.vn`);
    mockState.checkResult = { ok: true, paid: true, message: "Đã nhận tiền" };
    const res = await POST(checkReq({ code: order.code, email: emails[emails.length - 1] }));
    expect(res.status).toBe(200);
    const row = await prisma.order.findUnique({ where: { code: order.code } });
    expect(row?.paymentStatus).toBe("paid");
  });

  it("logged-in user chỉ dò đơn của mình — đơn người khác → 403; admin bypass", async () => {
    const other = await makeOrder(`vq-owner-${Date.now()}@kit.vn`);
    mockState.session = { id: "user-x", name: "X", email: `vq-x-${Date.now()}@kit.vn`, role: "customer" };
    const forbidden = await POST(checkReq({ code: other.code }));
    expect(forbidden.status).toBe(403);

    mockState.session = { id: "admin-1", name: "A", email: `vq-admin-${Date.now()}@kit.vn`, role: "admin" };
    const okAdmin = await POST(checkReq({ code: other.code }));
    expect(okAdmin.status).toBe(200);
  });

  it("thiếu mã đơn → 400", async () => {
    const res = await POST(checkReq({}));
    expect(res.status).toBe(400);
  });
});
