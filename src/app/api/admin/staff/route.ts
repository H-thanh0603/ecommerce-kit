import { NextResponse } from "next/server";
import { createStaff, listStaff, requireAdmin, revokeStaff } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const staff = await listStaff();
  return NextResponse.json({
    staff: staff.map((s) => ({ ...s, createdAt: s.createdAt.toISOString().slice(0, 10) })),
    me: admin.id,
  });
}

async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "revoke") {
      await revokeStaff(String(body.id || ""), admin.id);
      return NextResponse.json({ ok: true });
    }
    const user = await createStaff({
      name: String(body.name || ""),
      email: String(body.email || ""),
      password: String(body.password || ""),
    });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Không lưu được" }, { status: 400 });
  }
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
