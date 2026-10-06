import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

/** Tách từ order.ts — CRM tối thiểu: khách hàng, lead liên hệ, đăng ký nhận tin. */

/** Danh sách khách — phân trang + search DB-side (không kéo toàn bảng về filter trong RAM).
 *  Default sort: khách mới nhất trước. */
export async function listCustomers(opts?: { q?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, Math.floor(opts?.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.floor(opts?.pageSize ?? 20) || 20));
  const q = (opts?.q || "").trim();
  const where: Prisma.UserWhereInput = {
    role: "customer",
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      points: u.points,
      memberTier: u.memberTier,
      orderCount: u._count.orders,
      createdAt: u.createdAt.toISOString().slice(0, 10),
    })),
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
  };
}

export async function createLead(data: { name: string; email: string; phone?: string; message: string }) {
  return prisma.lead.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      message: data.message,
    },
  });
}

export async function listLeads() {
  return prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
}

export async function subscribeNewsletter(email: string) {
  return prisma.newsletter.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase() },
    update: {},
  });
}

export async function listNewsletter() {
  return prisma.newsletter.findMany({ orderBy: { createdAt: "desc" } });
}
