import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";

/**
 * Chọn message an toàn cho client từ error bắt được:
 * - Business error (throw new Error("...tiếng Việt...")) → giữ nguyên (UX).
 * - Prisma known error (P2002 trùng, P2025 không thấy) → message chung thân thiện.
 * - Prisma validation/internal + lỗi lạ → fallback chung, KHÔNG lộ message gốc
 *   (có thể chứa tên bảng/constraint/query). Log phía server là đủ.
 */
export function publicError(e: unknown, fallback = "Lỗi xử lý — thử lại sau"): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "Dữ liệu đã tồn tại — kiểm tra lại";
    if (e.code === "P2025") return "Không tìm thấy dữ liệu";
    return fallback;
  }
  if (e instanceof Error) {
    const msg = e.message;
    const looksInternal =
      !msg || msg.length > 300 || /Prisma|Invalid `|prepared statement|Connection|ECONN|timeout/i.test(msg);
    if (!looksInternal) return msg;
  }
  return fallback;
}

/** req_xxxxxxxx — trả về client trong error để đối chiếu log/Sentry khi user báo lỗi. */
export function newRequestId() {
  return `req_${randomBytes(4).toString("hex")}`;
}

/**
 * Lỗi API có cấu trúc thống nhất (rule BE-013): `{ ok, code, message, requestId }`.
 * `code` máy đọc được cho frontend map UX; `message` tiếng Việt hiển thị thẳng;
 * `requestId` in log server để trace chéo khi user báo lỗi. Dùng cho route business quan trọng.
 */
export function apiError(
  code: string,
  message: string,
): { ok: false; code: string; message: string; requestId: string } {
  const requestId = newRequestId();
  console.error(`[api-error] ${requestId} ${code}: ${message}`);
  return { ok: false as const, code, message, requestId };
}

/** Wrapper NextResponse cho apiError — status nằm ở đây, không nằm trong body. */
export function apiErrorResponse(code: string, message: string, status = 400) {
  return Response.json(apiError(code, message), { status });
}
