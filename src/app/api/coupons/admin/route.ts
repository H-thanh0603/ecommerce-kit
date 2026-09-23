import { NextResponse } from "next/server";
import { deleteCoupon, listCoupons, upsertCoupon } from "@/server/commerce";
import { requireAdmin } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  return NextResponse.json({ coupons: await listCoupons() });
}

async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const coupon = await upsertCoupon({
      id: body.id,
      code: String(body.code || ""),
      type: String(body.type || "percent"),
      value: Number(body.value),
      minOrder: Number(body.minOrder || 0),
      active: body.active !== false,
      maxUses: body.maxUses === "" || body.maxUses == null ? null : Number(body.maxUses),
      maxUsesPerUser: body.maxUsesPerUser === "" || body.maxUsesPerUser == null ? null : Number(body.maxUsesPerUser),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
    });
    const { logAudit } = await import("@/server/audit");
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "coupon.upsert",
      entity: "Coupon",
      entityId: coupon.id,
      after: { code: coupon.code, type: coupon.type, value: coupon.value, active: coupon.active },
    });
    return NextResponse.json({ coupon });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Lỗi" }, { status: 400 });
  }
}

async function deleteHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Thiếu id" }, { status: 400 });
  await deleteCoupon(id);
  const { logAudit } = await import("@/server/audit");
  await logAudit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "coupon.delete",
    entity: "Coupon",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
export const DELETE = withTenantHandler(deleteHandler);
