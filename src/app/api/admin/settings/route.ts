import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { getEffectiveSiteConfig, getSiteOverrides, saveSiteSettings } from "@/server/settings";
import { siteConfig } from "@/config/site";
import { revalidateTag } from "next/cache";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  const [effective, overrides] = await Promise.all([getEffectiveSiteConfig(), getSiteOverrides()]);
  return NextResponse.json({
    defaults: {
      brand: siteConfig.brand,
      theme: siteConfig.theme,
      shipping: siteConfig.shipping,
      features: siteConfig.features,
    },
    overrides,
    effective,
  });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 403 });
  try {
    const body = await req.json();
    const before = await getSiteOverrides();
    const effective = await saveSiteSettings(body);
    revalidateTag("catalog", "max");
    const { logAudit } = await import("@/server/audit");
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "settings.update",
      entity: "SiteSetting",
      before,
      after: body,
      ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "",
    });
    return NextResponse.json({ ok: true, effective });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Lưu thất bại" }, { status: 400 });
  }
}

