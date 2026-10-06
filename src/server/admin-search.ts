import { prisma } from "@/server/db";

/**
 * Tìm nhanh cho command palette ⌘K (pattern Twenty CRM) — module phụ.
 * 1 từ khóa quét 3 nhóm: đơn / sản phẩm / khách. DB-side, mỗi nhóm ≤5 dòng
 * (rule BE-009), route gọi hàm này phải guard admin + rate-limit (BE-007).
 */

export type AdminQuickSearchHit = {
  href: string;
  title: string;
  subtitle: string;
  kind: "order" | "product" | "customer";
};

const LIMIT = 5;

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

export async function adminQuickSearch(rawQ: string): Promise<AdminQuickSearchHit[]> {
  const q = rawQ.trim();
  if (q.length < 2) return [];

  const [orders, products, customers] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { customer: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: { id: true, code: true, customer: true, total: true, status: true },
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { searchText: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { sold: "desc" },
      take: LIMIT,
      select: { id: true, slug: true, name: true, price: true },
    }),
    prisma.user.findMany({
      where: {
        role: "customer",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: { id: true, name: true, email: true },
    }),
  ]);

  return [
    ...orders.map((o): AdminQuickSearchHit => ({
      kind: "order",
      href: `/admin/don-hang?q=${encodeURIComponent(o.code)}&order=${o.id}`,
      title: o.code,
      subtitle: `${o.customer} · ${fmtVnd(o.total)} · ${o.status}`,
    })),
    ...products.map((p): AdminQuickSearchHit => ({
      kind: "product",
      href: `/admin/san-pham?q=${encodeURIComponent(p.name)}&edit=${p.id}`,
      title: p.name,
      subtitle: fmtVnd(p.price),
    })),
    ...customers.map((c): AdminQuickSearchHit => ({
      kind: "customer",
      href: `/admin/khach-hang?q=${encodeURIComponent(c.email)}`,
      title: c.name,
      subtitle: c.email,
    })),
  ];
}
