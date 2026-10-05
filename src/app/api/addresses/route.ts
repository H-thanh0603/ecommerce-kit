import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { prisma } from "@/server/db";
import { withTenantHandler } from "@/server/request-tenant";
import { addressSchema } from "@/lib/validators";

async function me() {
  const s = await getSession();
  return s && s.role === "customer" ? s : s?.role === "admin" ? s : null;
}

async function getHandler() {
  const s = await me();
  if (!s) return NextResponse.json({ addresses: [] });
  const addresses = await prisma.address.findMany({ where: { userId: s.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json({ addresses });
}

async function postHandler(req: Request) {
  const s = await me();
  if (!s) return NextResponse.json({ message: "Cần đăng nhập" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Thiếu tên/SĐT/địa chỉ" }, { status: 400 });
  }
  const d = parsed.data;
  if (d.isDefault) await prisma.address.updateMany({ where: { userId: s.id }, data: { isDefault: false } });
  const row = await prisma.address.create({
    data: {
      userId: s.id,
      label: (d.label || "Nhà").slice(0, 20),
      name: d.name,
      phone: d.phone,
      address: d.address,
      isDefault: Boolean(d.isDefault),
    },
  });
  return NextResponse.json({ ok: true, address: row });
}

async function deleteHandler(req: Request) {
  const s = await me();
  if (!s) return NextResponse.json({ message: "Cần đăng nhập" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  await prisma.address.deleteMany({ where: { id: String(body.id || ""), userId: s.id } });
  return NextResponse.json({ ok: true });
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
export const DELETE = withTenantHandler(deleteHandler);
