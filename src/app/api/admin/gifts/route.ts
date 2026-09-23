import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { deleteGift, listGifts, upsertGift } from "@/server/giftcard";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  return NextResponse.json({ gifts: await listGifts() });
}

async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { logAudit } = await import("@/server/audit");
  if (body.action === "delete") {
    try {
      await deleteGift(String(body.id || ""));
      await logAudit({
        actorId: admin.id,
        actorEmail: admin.email,
        action: "gift.delete",
        entity: "GiftCard",
        entityId: String(body.id || ""),
      });
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Xóa thất bại" }, { status: 400 });
    }
  }
  try {
    const gift = await upsertGift({
      id: body.id || undefined,
      code: String(body.code || ""),
      balance: Number(body.balance || 0),
      active: body.active !== false,
      note: String(body.note || ""),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "gift.upsert",
      entity: "GiftCard",
      entityId: gift.id,
      after: { code: gift.code, balance: gift.balance, active: gift.active },
    });
    return NextResponse.json({ ok: true, gift });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Lưu thất bại" }, { status: 400 });
  }
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
