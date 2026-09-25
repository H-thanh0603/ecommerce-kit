import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { withTenantHandler } from "@/server/request-tenant";

/**
 * Beacon endpoint cho analytics nội bộ (NEXT_PUBLIC_TRACK_INTERNAL=1).
 * Hiện tại chỉ log — mở rộng sau: ghi bảng AnalyticsEvent, đẩy sang ClickHouse/PostHog.
 * Không lưu IP, không lưu PII — chỉ event name + url + props.
 */
async function postHandler(req: Request) {
  const rl = await rateLimit(clientKey(req, "track"), 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });
  try {
    const body = await req.json();
    const event = typeof body?.event === "string" ? body.event.slice(0, 64) : "";
    const url = typeof body?.url === "string" ? body.url.slice(0, 256) : "";
    if (!event || !url) return NextResponse.json({ ok: false }, { status: 400 });
    if (process.env.NODE_ENV !== "production") {
      console.log("[track]", event, url, body.props ?? {});
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export const POST = withTenantHandler(postHandler);
