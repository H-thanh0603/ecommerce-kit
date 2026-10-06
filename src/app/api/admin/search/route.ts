import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";
import { apiErrorResponse } from "@/server/errors";
import { adminQuickSearch } from "@/server/admin-search";
import { rateLimit, clientKey } from "@/server/rate-limit";

/** Tìm nhanh cho palette ⌘K — guard admin (BE-001) + rate-limit (BE-007). */
async function getHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiErrorResponse("forbidden", "Cần quyền admin", 403);

  const limit = await rateLimit(clientKey(req, "admin-search"), 30, 60_000);
  if (!limit.ok) return apiErrorResponse("rate_limited", "Tìm quá nhanh — chờ chút rồi thử lại", 429);

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return apiErrorResponse("missing_query", "Thiếu từ khóa tìm kiếm", 400);
  if (q.length > 100) return apiErrorResponse("query_too_long", "Từ khóa quá dài", 400);

  const hits = await adminQuickSearch(q);
  return NextResponse.json({ ok: true as const, hits });
}

export const GET = withTenantHandler(getHandler);
