import { NextResponse } from "next/server";
import { deleteCoupon, listCoupons, upsertCoupon } from "@/server/commerce";
import { requireAdmin } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";
import { couponAdminSchema } from "@/lib/validators";

async function getHandler() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  return NextResponse.json({ coupons: await listCoupons() });
}

async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = couponAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  try {
    const d = parsed.data;
    const coupon = await upsertCoupon({
      id: d.id,
      code: d.code,
      type: d.type,
      value: d.value,
      minOrder: d.minOrder,
      active: d.active,
      maxUses: d.maxUses ?? null,
      maxUsesPerUser: d.maxUsesPerUser ?? null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
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
