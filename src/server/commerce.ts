/**
 * ============================================================
 *  FACADE TƯƠNG THÍCH NGƯỢC — không thêm logic mới ở đây.
 * ============================================================
 * Ranh giới lõi (CORE BOUNDARY):
 * - Muốn sửa danh mục/sản phẩm/bài viết/review → `src/server/catalog.ts`
 * - Muốn sửa mã giảm giá → `src/server/coupon.ts`
 * - Muốn sửa giỏ/wishlist → `src/server/cart.ts`
 * - Muốn sửa đơn/checkout/thống kê/lead → `src/server/order.ts`
 * - Module mới (booking/kg/kho...) KHÔNG đụng 4 file trên:
 *   tạo file riêng trong `src/server/` + flag trong `src/config/site.ts`
 *   + đăng ký trong `src/lib/modules.ts`.
 *
 * Import mới nên trỏ thẳng module con. File này chỉ re-export
 * để code cũ (`@/server/commerce`) vẫn chạy.
 */

export * from "@/server/catalog";
export * from "@/server/coupon";
export * from "@/server/cart";
export * from "@/server/order";
