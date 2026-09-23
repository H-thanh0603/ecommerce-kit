import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { deleteWebhook, dispatchWebhooks, listWebhooks, upsertWebhook } from "@/server/webhooks";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  return NextResponse.json({ webhooks: await listWebhooks() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { logAudit } = await import("@/server/audit");
  try {
    if (body.action === "delete") {
      await deleteWebhook(String(body.id || ""));
      await logAudit({
        actorId: admin.id,
        actorEmail: admin.email,
        action: "webhook.delete",
        entity: "WebhookEndpoint",
        entityId: String(body.id || ""),
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "ping") {
      const results = await dispatchWebhooks("ping", { at: new Date().toISOString() });
      return NextResponse.json({ ok: true, results });
    }
    const wh = await upsertWebhook({
      id: body.id || undefined,
      url: String(body.url || ""),
      secret: body.secret ? String(body.secret) : undefined,
      events: String(body.events || ""),
      active: body.active !== false,
    });
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "webhook.upsert",
      entity: "WebhookEndpoint",
      entityId: wh.id,
      after: { url: wh.url, events: wh.events, active: wh.active },
    });
    return NextResponse.json({ ok: true, webhook: wh });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Lưu thất bại" }, { status: 400 });
  }
}
