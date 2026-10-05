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
