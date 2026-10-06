import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { rateLimit, clientKey } from "@/server/rate-limit";
import { updateOrderStatus } from "@/server/commerce";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/types";
import { prisma } from "@/server/db";
import { apiErrorResponse } from "@/server/errors";
import { withTenantHandler } from "@/server/request-tenant";

const MAX_IDS = 50;

/**
 * Bulk đổi trạng thái đơn — 1 request thay vì N PATCH tuần tự từ client.
 * Trả kết quả từng item (rule UI-009): partial-fail được báo rõ, không all-or-nothing giả tạo.
 * State machine vẫn enforce per-item qua updateOrderStatus.
 */
async function postHandler(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  if (!(await rateLimit(clientKey(req, "bulk-status"), 20, 60_000)).ok) {
    return NextResponse.json({ message: "Quá nhiều yêu cầu, thử lại sau" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((i: unknown) => typeof i === "string") : [];
  const status = body.status as OrderStatus;
  if (!ids.length) return apiErrorResponse("BULK_IDS_EMPTY", "Thiếu danh sách đơn", 400);
  if (ids.length > MAX_IDS) return apiErrorResponse("BULK_IDS_TOO_MANY", `Tối đa ${MAX_IDS} đơn mỗi lượt`, 400);
  if (!Object.values(ORDER_TRANSITIONS).some((t) => t.includes(status))) {
    return apiErrorResponse("BULK_STATUS_INVALID", "Trạng thái không hợp lệ", 400);
  }
  // id → code 1 query, để báo lỗi theo mã đơn admin nhận diện được (rule UI-004).
  const rows = await prisma.order.findMany({ where: { id: { in: ids } }, select: { id: true, code: true } });
  const codeOf = new Map(rows.map((r) => [r.id, r.code]));

  const results = await Promise.all(
    ids.map(async (id) => {
      const code = codeOf.get(id) || id;
      try {
        await updateOrderStatus(id, status, admin.email);
        return { id, code, ok: true as const };
      } catch (e) {
        return { id, code, ok: false as const, message: e instanceof Error ? e.message : "Lỗi" };
      }
    }),
  );
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    okCount: ok.length,
    failedCount: failed.length,
    results,
  });
}

export const POST = withTenantHandler(postHandler);
