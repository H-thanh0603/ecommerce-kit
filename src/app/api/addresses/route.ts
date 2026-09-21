import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { prisma } from "@/server/db";

async function me() {
  const s = await getSession();
  return s && s.role === "customer" ? s : s?.role === "admin" ? s : null;
}

export async function GET() {
  const s = await me();
  if (!s) return NextResponse.json({ addresses: [] });
  const addresses = await prisma.address.findMany({ where: { userId: s.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json({ addresses });
}

export async function POST(req: Request) {
  const s = await me();
  if (!s) return NextResponse.json({ message: "Cần đăng nhập" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  if (!name || !phone || !address) return NextResponse.json({ message: "Thiếu tên/SĐT/địa chỉ" }, { status: 400 });
  if (body.isDefault) await prisma.address.updateMany({ where: { userId: s.id }, data: { isDefault: false } });
  const row = await prisma.address.create({
    data: {
      userId: s.id,
      label: String(body.label || "Nhà").slice(0, 20),
      name,
      phone,
      address,
      isDefault: Boolean(body.isDefault),
    },
  });
  return NextResponse.json({ ok: true, address: row });
}

export async function DELETE(req: Request) {
  const s = await me();
  if (!s) return NextResponse.json({ message: "Cần đăng nhập" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  await prisma.address.deleteMany({ where: { id: String(body.id || ""), userId: s.id } });
  return NextResponse.json({ ok: true });
}
