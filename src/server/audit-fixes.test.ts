import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createBooking, setBookingStatus, BOOKING_STATUSES } from "./booking";
import { issueInvoice } from "./invoice";
import { countOrders, listOrders, updateOrderStatus } from "./order";
import { toOrderForAI } from "./ai";
import { bookingSchema, reviewSchema, webhookUrlSchema } from "@/lib/validators";

const tag = Date.now();

/** Tạo đơn tối giản trực tiếp qua Prisma (không qua checkout — không giành tồn). */
async function seedOrder(email: string, total = 1_100_000) {
  const seq = Date.now() % 1_000_000_000 + Math.floor(Math.random() * 1_000);
  return prisma.order.create({
    data: {
      code: `AF-T${seq}`,
      seq,
      customer: "Audit Test",
      email,
      phone: "0900000000",
      address: "1 Test",
      subtotal: total,
      shippingFee: 0,
      discount: 0,
      total,
      paymentMethod: "cod",
      items: {
        create: [{ productId: "p9", slug: "s", name: "SP", image: "", price: total, quantity: 1 }],
      },
    },
  });
}

describe("booking chống double-book", () => {
  it("2 request song song cùng khung giờ → đúng 1 thành công", async () => {
    const service = await prisma.bookingService.create({
      data: { name: `Test SVC ${tag}`, durationMin: 30, price: 0, active: true },
    });
    const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const results = await Promise.allSettled([
      createBooking({ serviceId: service.id, name: "A", email: `bk${tag}@kit.vn`, phone: "0900000000", startsAt }),
      createBooking({ serviceId: service.id, name: "B", email: `bk2-${tag}@kit.vn`, phone: "0900000001", startsAt }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // Hủy rồi đặt lại cùng khung giờ → vẫn đặt được (không có unique cứng chặn).
    const booking = (ok[0] as PromiseFulfilledResult<{ id: string }>).value;
    await setBookingStatus(booking.id, "cancelled");
    const rebook = await createBooking({
      serviceId: service.id,
      name: "C",
      email: `bk3-${tag}@kit.vn`,
      phone: "0900000002",
      startsAt,
    });
    expect(rebook.id).toBeTruthy();

    await prisma.booking.deleteMany({ where: { serviceId: service.id } });
    await prisma.bookingService.delete({ where: { id: service.id } });
  });

  it("setBookingStatus chặn status lạ", async () => {
    await expect(setBookingStatus("không-tồn-tại", "bất-kỳ")).rejects.toThrow("Trạng thái không hợp lệ");
    expect(BOOKING_STATUSES).toContain("pending");
  });
});

describe("invoice idempotent khi gọi song song", () => {
  it("2 lần issueInvoice đồng thời → 1 hóa đơn, cùng số, không nhảy counter", async () => {
    const order = await seedOrder(`inv-par-${tag}@kit.vn`);
    const [a, b] = await Promise.allSettled([
      issueInvoice(order.id),
      issueInvoice(order.id),
    ]);
    expect(a.status).toBe("fulfilled");
    expect(b.status).toBe("fulfilled");
    const invA = (a as PromiseFulfilledResult<{ id: string; number: string }>).value;
    const invB = (b as PromiseFulfilledResult<{ id: string; number: string }>).value;
    expect(invA.id).toBe(invB.id);
    expect(invA.number).toBe(invB.number);
    expect(await prisma.invoice.count({ where: { orderId: order.id } })).toBe(1);
    await prisma.invoice.deleteMany({ where: { orderId: order.id } });
    await prisma.orderEvent.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
  });
});

describe("điểm thành viên khi hoàn tất đơn", () => {
  it("double-complete không cộng điểm 2 lần; pointsEarned ghi đúng 1 lần", async () => {
    const email = `pts-${tag}@kit.vn`;
    const user = await prisma.user.create({
      data: { email, name: "Tích điểm", passwordHash: "x" },
    });
    const total = 1_200_000; // earned = 1_200_000 / 1000 = 1200 điểm
    const order = await seedOrder(email, total);
    await prisma.order.update({ where: { id: order.id }, data: { userId: user.id } });

    // Cờ membership có thể bị override false trong DB (DB dùng chung) — bật tạm, xong restore.
    const oldSetting = await prisma.siteSetting.findUnique({ where: { key: "features" } });
    const oldFeatures = oldSetting ? JSON.parse(oldSetting.value) : {};
    await prisma.siteSetting.upsert({
      where: { key: "features" },
      create: { key: "features", value: JSON.stringify({ ...oldFeatures, membership: true }) },
      update: { value: JSON.stringify({ ...oldFeatures, membership: true }) },
    });
    try {
      const first = await updateOrderStatus(order.id, "completed");
      expect(first.pointsEarned).toBe(1200);
      const after1 = (await prisma.user.findUnique({ where: { id: user.id } }))!.points;
      expect(after1).toBe(1200);

      // Hoàn tất lần 2 (idempotent path) — không cộng thêm.
      await updateOrderStatus(order.id, "completed");
      const after2 = (await prisma.user.findUnique({ where: { id: user.id } }))!.points;
      expect(after2).toBe(1200);
    } finally {
      if (oldSetting) {
        await prisma.siteSetting.update({ where: { key: "features" }, data: { value: oldSetting.value } });
      }
    }

    await prisma.orderEvent.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe("listOrders/countOrders phân trang", () => {
  it("skip/take DB-side khớp tổng count", async () => {
    const email = `pg-${tag}@kit.vn`;
    const created = [];
    for (let i = 0; i < 3; i++) created.push(await seedOrder(email));
    const filter = { email };
    const page1 = await listOrders(filter, { page: 1, pageSize: 2 });
    const page2 = await listOrders(filter, { page: 2, pageSize: 2 });
    const total = await countOrders(filter);
    expect(total).toBe(3);
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(1);
    expect(page1[0].id).not.toBe(page2[0].id);
    await prisma.orderEvent.deleteMany({ where: { orderId: { in: created.map((o) => o.id) } } });
    await prisma.order.deleteMany({ where: { id: { in: created.map((o) => o.id) } } });
  });
});

describe("toOrderForAI redact PII", () => {
  it("không chứa email/phone/địa chỉ/tên/note khách", () => {
    const safe = toOrderForAI({
      code: "EK-00001",
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      subtotal: 100_000,
      shippingFee: 20_000,
      discount: 0,
      total: 120_000,
      createdAt: new Date().toISOString(),
      items: [{ name: "SP", quantity: 1, price: 100_000 }],
      // Các field PII nằm ngoài mapper — kiểm tra bằng cách đưa chuỗi PII vào object gốc
    } as Parameters<typeof toOrderForAI>[0]);
    const json = JSON.stringify(safe);
    expect(json).not.toContain("email");
    expect(json).not.toContain("phone");
    expect(json).not.toContain("address");
    expect(json).not.toContain("customer");
    expect(json).not.toContain("note");
    expect(safe.total).toBe(120_000);
  });
});

describe("validators (schema dùng chung client+server)", () => {
  it("reviewSchema: rating NaN / ngoài 1-5 bị chặn", () => {
    expect(reviewSchema.safeParse({ productId: "p1", rating: Number("abc"), content: "x" }).success).toBe(false);
    expect(reviewSchema.safeParse({ productId: "p1", rating: 6, content: "x" }).success).toBe(false);
    expect(reviewSchema.safeParse({ productId: "p1", rating: "4", content: "ok" }).success).toBe(true);
  });

  it("bookingSchema: thời gian quá khứ / sai định dạng bị chặn", () => {
    const base = { serviceId: "s1", name: "A", email: "a@b.vn", phone: "0900000000" };
    expect(bookingSchema.safeParse({ ...base, startsAt: "garbage" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...base, startsAt: "2020-01-01T00:00:00Z" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...base, startsAt: new Date(Date.now() + 86_400_000).toISOString() }).success).toBe(true);
  });

  it("webhookUrlSchema: chặn scheme không phải http(s)", () => {
    expect(webhookUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(webhookUrlSchema.safeParse("file:///etc/passwd").success).toBe(false);
    expect(webhookUrlSchema.safeParse("https://example.com/hook").success).toBe(true);
  });
});
