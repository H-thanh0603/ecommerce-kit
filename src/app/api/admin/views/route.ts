import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { withTenantHandler } from "@/server/request-tenant";
import { apiErrorResponse } from "@/server/errors";
import { deleteSavedView, listSavedViews, saveSavedView, savedViewInput } from "@/server/admin-views";

/** Bộ lọc lưu sẵn per-user — mọi nhánh đều guard admin + scope theo userId. */
async function getHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiErrorResponse("forbidden", "Cần quyền admin", 403);
  const path = new URL(req.url).searchParams.get("path") ?? "";
  try {
    const views = await listSavedViews(admin.id, path);
    return NextResponse.json({ ok: true as const, views });
  } catch {
    return apiErrorResponse("bad_path", "Path không hợp lệ", 400);
  }
}

async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiErrorResponse("forbidden", "Cần quyền admin", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiErrorResponse("bad_json", "Body không phải JSON hợp lệ", 400);
  }
  const parsed = savedViewInput.safeParse(body);
  if (!parsed.success) return apiErrorResponse("bad_input", "Bộ lọc không hợp lệ", 400);
  try {
    const view = await saveSavedView(admin.id, parsed.data);
    return NextResponse.json({ ok: true as const, view });
  } catch (e) {
    return apiErrorResponse("save_failed", e instanceof Error ? e.message : "Lưu bộ lọc thất bại", 400);
  }
}

async function deleteHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return apiErrorResponse("forbidden", "Cần quyền admin", 403);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return apiErrorResponse("missing_id", "Thiếu id bộ lọc", 400);
  try {
    await deleteSavedView(admin.id, id);
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    return apiErrorResponse("delete_failed", e instanceof Error ? e.message : "Xóa bộ lọc thất bại", 400);
  }
}

export const GET = withTenantHandler(getHandler);
export const POST = withTenantHandler(postHandler);
export const DELETE = withTenantHandler(deleteHandler);
