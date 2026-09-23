import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/server/platform";
import { createTenant, platformDb } from "@/server/platform-db";
import { withTenantHandler } from "@/server/request-tenant";

async function getHandler() {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ ok: false, message: "Cần đăng nhập platform" }, { status: 401 });
  const tenants = await platformDb.tenant.findMany({
    include: { domains: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, tenants });
}

async function postHandler(req: Request) {
  const admin = await requirePlatformAdmin();
  if (!admin) return NextResponse.json({ ok: false, message: "Cần đăng nhập platform" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const hosts = Array.isArray(body.hosts)
      ? body.hosts.map((h: unknown) => String(h).trim()).filter(Boolean)
      : String(body.hosts || "")
          .split(",")
          .map((h: string) => h.trim())
          .filter(Boolean);
    const tenant = await createTenant({
      slug: String(body.slug || "").trim(),
      name: String(body.name || ""),
      hosts,
    });
    return NextResponse.json({ ok: true, tenant });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Tạo tenant thất bại" },
      { status: 400 },
    );
  }
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
