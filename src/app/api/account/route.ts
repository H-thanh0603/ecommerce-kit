import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { prisma } from "@/server/db";
import { withTenantHandler } from "@/server/request-tenant";

/**
 * Quyền chủ dữ liệu (Q62/Q69):
 * GET  → export JSON dữ liệu cá nhân (orders, addresses, reviews).
 * DELETE → xóa/ẩn danh tài khoản + PII (orders giữ lại ở dạng ẩn danh cho kế toán).
 */
async function getHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Cần đăng nhập" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      points: true,
      memberTier: true,
      createdAt: true,
      addresses: true,
      reviews: { select: { id: true, productId: true, rating: true, content: true, createdAt: true } },
      orders: {
        select: {
          code: true,
          customer: true,
          email: true,
          phone: true,
          address: true,
          total: true,
          status: true,
          paymentMethod: true,
          createdAt: true,
          items: { select: { name: true, quantity: true, price: true } },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ message: "Không thấy tài khoản" }, { status: 404 });
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    profile: {
      email: user.email,
      name: user.name,
      points: user.points,
      memberTier: user.memberTier,
      createdAt: user.createdAt,
    },
    addresses: user.addresses,
    reviews: user.reviews,
    orders: user.orders,
  });
}

async function deleteHandler(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Cần đăng nhập" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const confirm = String(body.confirm || "");
  if (confirm !== "XOA") {
    return NextResponse.json(
      { message: 'Gõ "XOA" để xác nhận xóa tài khoản (không thể hoàn tác)' },
      { status: 400 },
    );
  }
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ message: "Không thấy tài khoản" }, { status: 404 });
  if (user.role === "admin") {
    return NextResponse.json({ message: "Không xóa tài khoản admin qua route này" }, { status: 403 });
  }

  // Anonymize PII trên đơn (giữ code/total cho kế toán), xóa PII còn lại.
  await prisma.$transaction([
    prisma.order.updateMany({
      where: { userId: user.id },
      data: { customer: "Đã xóa", email: "removed@invalid.local", phone: "", address: "" },
    }),
    prisma.review.updateMany({ where: { userId: user.id }, data: { author: "Ẩn danh" } }),
    prisma.address.deleteMany({ where: { userId: user.id } }),
    prisma.cartLine.deleteMany({ where: { userId: user.id } }),
    prisma.wishlistItem.deleteMany({ where: { userId: user.id } }),
    prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        email: `deleted+${user.id}@invalid.local`,
        name: "Đã xóa",
        passwordHash: "deleted",
        tokenVersion: { increment: 1 },
        mfaEnabled: false,
        mfaSecret: "",
        mfaRecovery: "[]",
        points: 0,
      },
    }),
  ]);
  const { clearSessionCookie } = await import("@/server/auth");
  await clearSessionCookie();
  const { logAudit } = await import("@/server/audit");
  await logAudit({
    actorId: user.id,
    actorEmail: "account-self-delete",
    action: "account.delete",
    entity: "User",
    entityId: user.id,
  });
  return NextResponse.json({ ok: true, message: "Đã xóa tài khoản và ẩn danh dữ liệu" });
}

export const GET = withTenantHandler(getHandler);
export const DELETE = withTenantHandler(deleteHandler);
