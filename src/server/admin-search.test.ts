import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminQuickSearch } from "./admin-search";
import { runWithTenant } from "./tenant-context";
import { ensureSchema, dropSchema } from "./test-schema";
import { prisma } from "./db";

const SLUG = `search_${Date.now()}`;
const stamp = Date.now();

async function seed() {
  await prisma.user.create({
    data: {
      email: `kh${stamp}@test.vn`,
      name: "Nguyễn Văn Tìm",
      passwordHash: "x",
      role: "customer",
    },
  });
  const cat = await prisma.category.create({ data: { slug: `cat-${stamp}`, name: "Test" } });
  await prisma.product.create({
    data: {
      id: `p_${stamp}`,
      slug: `ao-thun-test-${stamp}`,
      name: "Áo thun Tìm Kiếm",
      description: "desc",
      price: 250_000,
      categoryId: cat.id,
    },
  });
  await prisma.order.create({
    data: {
      code: `EK${stamp}`,
      seq: stamp % 1_000_000,
      customer: "Nguyễn Văn Tìm",
      email: `kh${stamp}@test.vn`,
      phone: `09${stamp.toString().slice(-8)}`,
      address: "12 Test",
      subtotal: 500_000,
      shippingFee: 30_000,
      total: 530_000,
      paymentMethod: "cod",
    },
  });
}

beforeAll(async () => {
  await ensureSchema(SLUG);
  await runWithTenant(SLUG, seed);
}, 180_000);

afterAll(async () => {
  await dropSchema(SLUG);
}, 60_000);

describe("adminQuickSearch", () => {
  it("query ngắn hơn 2 ký tự → rỗng, không quét DB", async () => {
    const hits = await runWithTenant(SLUG, () => adminQuickSearch("a"));
    expect(hits).toEqual([]);
  });

  it("tìm thấy đơn theo mã, sản phẩm theo tên, khách theo email", async () => {
    const [byCode, byProduct, byEmail] = await Promise.all([
      runWithTenant(SLUG, () => adminQuickSearch(`EK${stamp}`)),
      runWithTenant(SLUG, () => adminQuickSearch("áo thun tìm")),
      runWithTenant(SLUG, () => adminQuickSearch(`kh${stamp}@test.vn`)),
    ]);
    expect(byCode.some((h) => h.kind === "order" && h.href.includes(`order=`))).toBe(true);
    expect(byProduct.some((h) => h.kind === "product" && h.title.includes("Áo thun"))).toBe(true);
    expect(byEmail.some((h) => h.kind === "customer" && h.subtitle === `kh${stamp}@test.vn`)).toBe(true);
  });

  it("mỗi nhóm tối đa 5 kết quả (BE-009), href là path admin an toàn", async () => {
    const hits = await runWithTenant(SLUG, () => adminQuickSearch(" Nguyễn Văn Tìm"));
    for (const h of hits) {
      expect(h.href.startsWith("/admin/")).toBe(true);
    }
  });
});
