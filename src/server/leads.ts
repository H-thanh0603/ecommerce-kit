import { prisma } from "@/server/db";

/** Tách từ order.ts — CRM tối thiểu: khách hàng, lead liên hệ, đăng ký nhận tin. */

export async function listCustomers(opts?: { page?: number; pageSize?: number }) {
  const paged = opts?.page != null || opts?.pageSize != null;
  const page = Math.max(1, Math.floor(opts?.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.floor(opts?.pageSize ?? 20) || 20));
  const rows = await prisma.user.findMany({
    where: { role: "customer" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
    ...(paged ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
  });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    points: u.points,
    memberTier: u.memberTier,
    orderCount: u._count.orders,
    createdAt: u.createdAt.toISOString().slice(0, 10),
  }));
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
