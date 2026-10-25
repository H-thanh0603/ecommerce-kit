import { money } from "@/lib/format";
import { matchProductIds } from "@/server/catalog";
import { prisma } from "@/server/db";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types";

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

export async function adminQuickSearch(rawQ: string): Promise<AdminQuickSearchHit[]> {
  const q = rawQ.trim();
  if (q.length < 2) return [];

  const [orderHits, productIds, customerHits] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { customer: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: { id: true, code: true, customer: true, total: true, status: true },
    }),
    matchProductIds(q, LIMIT),
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

  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        orderBy: { sold: "desc" },
        take: LIMIT,
        select: { id: true, slug: true, name: true, price: true },
      })
    : [];

  return [
    ...orderHits.map((o): AdminQuickSearchHit => ({
      kind: "order",
      href: `/admin/don-hang?q=${encodeURIComponent(o.code)}&order=${o.id}`,
      title: o.code,
      subtitle: `${o.customer} · ${money(o.total)} · ${ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}`,
    })),
    ...products.map((p): AdminQuickSearchHit => ({
      kind: "product",
      href: `/admin/san-pham?q=${encodeURIComponent(p.name)}&edit=${p.id}`,
      title: p.name,
      subtitle: money(p.price),
    })),
    ...customerHits.map((c): AdminQuickSearchHit => ({
      kind: "customer",
      href: `/admin/khach-hang?q=${encodeURIComponent(c.email)}`,
      title: c.name,
      subtitle: c.email,
    })),
  ];
}
