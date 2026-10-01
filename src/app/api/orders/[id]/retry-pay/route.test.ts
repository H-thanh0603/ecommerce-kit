import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Session điều khiển được — route đọc getSession từ module này.
const mockState = vi.hoisted(() => ({
  session: null as null | { id: string; name: string; email: string; role: "customer" | "admin" },
}));
vi.mock("@/server/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/server/auth")>();
  return { ...mod, getSession: async () => mockState.session };
});
vi.mock("next/headers", () => ({
  headers: async () => new Headers({}),
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

import { POST } from "./route";
import { prisma } from "@/server/db";
import { createOrder, getProductById } from "@/server/commerce";
import { defaultWarehouse, setWarehouseStock } from "@/server/warehouse";

const OLD_TMN = process.env.VNPAY_TMN_CODE;
const OLD_SECRET = process.env.VNPAY_HASH_SECRET;

// SP riêng cho file này là p5 (không SKU): p1/commerce-order, p2/giftcard,
// p3/returns, p4/order-events đã có chủ — vitest chạy file song song, dùng
// chung SP sẽ giành tồn nhau (xem AGENTS.md).
const PID = "p5";

async function restock() {
  const before = await getProductById(PID);
  await prisma.product.update({ where: { id: PID }, data: { stock: 10 } });
  const wh = await defaultWarehouse();
  if (wh) await setWarehouseStock(wh.id, PID, "", 10);
  return before!;
}

async function makeGuestOrder(email: string) {
  const before = await restock();
  return createOrder({
    customer: "Guest Retry",
    email,
    phone: "0900000000",
    address: "1 Test, Q1",
    paymentMethod: "vnpay",
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
}

function retryReq(id: string, body: unknown) {
  return new Request(`http://localhost/api/orders/${id}/retry-pay`, {
    method: "POST",
    headers: { host: "localhost", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("retry-pay chống IDOR", () => {
  const createdIds: string[] = [];

  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = "TESTCODE";
    process.env.VNPAY_HASH_SECRET = "TESTSECRET";
    mockState.session = null;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    mockState.session = null;
    if (OLD_TMN === undefined) delete process.env.VNPAY_TMN_CODE;
    else process.env.VNPAY_TMN_CODE = OLD_TMN;
    if (OLD_SECRET === undefined) delete process.env.VNPAY_HASH_SECRET;
    else process.env.VNPAY_HASH_SECRET = OLD_SECRET;
    if (createdIds.length) {
      await prisma.order.deleteMany({ where: { id: { in: createdIds } } });
      createdIds.length = 0;
    }
  });

  it("guest đúng email → pass, nhận payUrl", async () => {
    const email = `rt-ok-${Date.now()}@kit.vn`;
    const order = await makeGuestOrder(email);
    createdIds.push(order.id);
    const res = await POST(retryReq(order.id, { email }), {
      params: Promise.resolve({ id: order.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.payUrl).toBe("string");
    expect(body.payUrl).toContain("vnpayment");
    expect(body.order.email).toBe(email);
  });

  it("guest sai email → 404, không lộ PII/tồn tại", async () => {
    const email = `rt-no-${Date.now()}@kit.vn`;
    const order = await makeGuestOrder(email);
    createdIds.push(order.id);
    const res = await POST(retryReq(order.id, { email: "kẻ@lạ.vn" }), {
      params: Promise.resolve({ id: order.id }),
    });
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).not.toContain(email);
    expect(text).not.toContain("payUrl");
  });

  it("admin không cần email → pass", async () => {
    const email = `rt-ad-${Date.now()}@kit.vn`;
    const order = await makeGuestOrder(email);
    createdIds.push(order.id);
    mockState.session = { id: "admin1", name: "Admin", email: "admin@kit.vn", role: "admin" };
    const res = await POST(retryReq(order.id, { email: "sai@hoàn.toàn" }), {
      params: Promise.resolve({ id: order.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.payUrl).toBe("string");
  });

  it("logged-in user chỉ retry đơn của mình — đơn người khác → 403", async () => {
    const email = `rt-own-${Date.now()}@kit.vn`;
    const order = await makeGuestOrder(email);
    createdIds.push(order.id);
    mockState.session = { id: "user-khac", name: "Khác", email: "khac@kit.vn", role: "customer" };
    const res = await POST(retryReq(order.id, { email }), {
      params: Promise.resolve({ id: order.id }),
    });
    expect(res.status).toBe(403);
  });
});
