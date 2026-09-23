import { afterAll, describe, expect, it } from "vitest";
import { platformDb, createTenant, findTenantByHost } from "./platform-db";
import { slugSchema } from "./tenant";

const slug = `t${Date.now()}`;

describe("platform tenant", () => {
  it("create + findTenantByHost; slug sai bị chặn", async () => {
    const t = await createTenant({
      slug,
      name: "Test Shop",
      hosts: [`${slug}.test.vn`, `www.${slug}.test.vn`],
    });
    expect(t.slug).toBe(slug);
    expect(slugSchema.safeParse(slug).success).toBe(true);

    expect((await findTenantByHost(`${slug}.test.vn`))?.slug).toBe(slug);
    expect(await findTenantByHost("khong-co.test.vn")).toBeNull();

    await expect(createTenant({ slug: "public", name: "X", hosts: ["public.vn"] })).rejects.toThrow();
    // `${slug}_bad` hợp lệ regex slugSchema → dùng slug sai định dạng thật
    await expect(createTenant({ slug: "Slug-Bad", name: "X", hosts: ["bad.vn"] })).rejects.toThrow();
    // domain đã gán → reject
    await expect(
      createTenant({ slug: `${slug}_x`, name: "Y", hosts: [`${slug}.test.vn`] }),
    ).rejects.toThrow();
  });

  afterAll(async () => {
    await platformDb.tenantDomain.deleteMany({ where: { tenant: { slug: { startsWith: slug } } } });
    await platformDb.tenant.deleteMany({ where: { slug: { startsWith: slug } } });
    await platformDb.$disconnect();
  });
});
