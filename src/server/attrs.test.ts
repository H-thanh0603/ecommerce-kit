import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidateTag: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

import { prisma } from "./db";
import { getProductById, listProducts, upsertProduct } from "./catalog";
import { parseAttrs } from "@/components/admin/ProductEditor";

describe("product attrs", () => {
  it("parseAttrs bỏ dòng hỏng", () => {
    expect(parseAttrs("Chất liệu: cotton 100%\nKhông có hai chấm\n: trống\nXuất xứ: VN")).toEqual({
      "Chất liệu": "cotton 100%",
      "Xuất xứ": "VN",
    });
  });

  it("lưu + hiện + tìm được theo thuộc tính", async () => {
    const before = await getProductById("p7");
    const slug = before!.slug;
    await upsertProduct({
      id: "p7",
      slug,
      name: before!.name,
      description: before!.description,
      price: before!.price,
      images: before!.images,
      tags: before!.tags,
      categorySlug: before!.category,
      stock: 88,
      attrs: { "Thành phần": `tràm trà ${Date.now()}` },
    });
    const after = await getProductById("p7");
    expect(after!.attrs?.["Thành phần"]).toContain("tràm trà");
    const found = await listProducts({ q: "tram tra" });
    expect(found.items.some((p) => p.id === "p7")).toBe(true);
    // Dọn
    await prisma.product.update({ where: { id: "p7" }, data: { attrsJson: "{}" } });
  });
});
