import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { updateOrderStatus } from "@/server/commerce";
import { apiErrorResponse, publicError } from "@/server/errors";
import type { OrderStatus } from "@/types";
import { withTenantHandler } from "@/server/request-tenant";

const allowed: OrderStatus[] = ["pending", "confirmed", "shipping", "completed", "cancelled"];

async function patchHandler(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as OrderStatus;
  if (!allowed.includes(status)) {
    return apiErrorResponse("ORDER_STATUS_INVALID", "Trạng thái không hợp lệ", 400);
  }
  try {
    const order = await updateOrderStatus(id, status, admin.email);
    return NextResponse.json({ order });
  } catch (e) {
    // Lỗi business (không thấy đơn / transition trái state machine) — 400 kèm code máy đọc được.
    const msg = publicError(e, "Không cập nhật được đơn");
    const code = /Không thể chuyển/.test(msg)
      ? "ORDER_TRANSITION_INVALID"
      : /Không tìm thấy/.test(msg)
        ? "ORDER_NOT_FOUND"
        : "ORDER_UPDATE_FAILED";
    return apiErrorResponse(code, msg, 400);
  }
}

export const PATCH = withTenantHandler(patchHandler);
