import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

import { prisma } from "./db";
import { listProducts } from "./catalog";

/** Filter giá (min/max) của listProducts — tạo SP riêng theo timestamp, xóa sau test. */
describe("listProducts price filter", () => {
  const stamp = Date.now();
  const ids = [`pf-low-${stamp}`, `pf-mid-${stamp}`, `pf-high-${stamp}`];

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
  });

  async function seedProduct(id: string, price: number) {
    await prisma.product.create({
      data: {
        id,
        slug: id,
        name: `Filter test ${id}`,
        description: "SP test filter giá",
        price,
        published: true,
        category: { connect: { slug: "cham-soc" } },
      },
    });
  }

  it("lọc theo khoảng giá: gte/lte, một chiều, và không truyền giá", async () => {
    await seedProduct(ids[0], 100_000);
    await seedProduct(ids[1], 500_000);
    await seedProduct(ids[2], 2_000_000);

    const both = await listProducts({ minPrice: 200_000, maxPrice: 1_000_000, ids });
    expect(both.items.map((p) => p.id)).toEqual([ids[1]]);

    const onlyMin = await listProducts({ minPrice: 1_000_001, ids });
    expect(onlyMin.items.map((p) => p.id)).toEqual([ids[2]]);

    const onlyMax = await listProducts({ maxPrice: 100_000, ids });
    expect(onlyMax.items.map((p) => p.id)).toEqual([ids[0]]);

    const none = await listProducts({ ids });
    expect(none.items.length).toBe(3);
  });
});
