import { isEnabled, type FeatureKey } from "@/config/site";

/**
 * Đăng ký module. Flag tắt = ẩn UI (isModuleOn).
 * Code lõi (catalog/cart) luôn có; module phụ nên dynamic import.
 */
export function isModuleOn(flag?: FeatureKey) {
  if (!flag) return true;
  return isEnabled(flag);
}

export const moduleCatalog = [
  {
    id: "core-catalog",
    name: "Danh mục & sản phẩm",
    included: true,
    files: ["src/app/san-pham", "src/server/catalog.ts"],
  },
  {
    id: "core-cart",
    name: "Giỏ hàng & checkout",
    included: true,
    files: ["src/app/gio-hang", "src/app/thanh-toan", "src/lib/cart.tsx", "src/server/cart.ts", "src/server/order.ts"],
  },
  {
    id: "core-coupon",
    name: "Mã giảm giá (lõi)",
    included: true,
    files: ["src/server/coupon.ts"],
  },
  {
    id: "core-auth",
    name: "Tài khoản khách",
    included: true,
    files: ["src/app/dang-nhap", "src/server/auth.ts"],
  },
  {
    id: "core-admin",
    name: "Admin quản trị",
    included: true,
    files: ["src/app/admin"],
  },
  {
    id: "payments",
    name: "Cổng thanh toán (COD / CK / adapter)",
    included: true,
    files: ["src/server/payments.ts"],
  },
  {
    id: "wishlist",
    name: "Yêu thích",
    flag: "wishlist",
    files: ["src/lib/wishlist.tsx"],
  },
  {
    id: "reviews",
    name: "Đánh giá sản phẩm",
    flag: "reviews",
    files: ["src/components/product/Reviews.tsx"],
  },
  {
    id: "coupons",
    name: "Mã giảm giá",
    flag: "coupons",
    files: ["src/app/thanh-toan"],
  },
  {
    id: "flash-sale",
    name: "Flash sale",
    flag: "flashSale",
    files: ["src/components/home/HomeView.tsx"],
  },
  {
    id: "blog",
    name: "Tin tức / journal",
    flag: "blog",
    files: ["src/app/tin-tuc"],
  },
  {
    id: "ai-chatbot",
    name: "Chatbot AI cửa hàng",
    flag: "aiChatbot",
    files: ["src/components/ai/ChatWidget.tsx", "src/app/api/ai/chat/route.ts"],
  },
  {
    id: "ai-agent",
    name: "AI Agent vận hành (admin)",
    flag: "aiAgent",
    files: ["src/app/admin/ai/page.tsx", "src/server/ai.ts"],
  },
  { id: "vnpay", name: "VNPay", included: true, files: ["src/server/vnpay.ts"] },
  { id: "ghn", name: "GHN vận chuyển", flag: "ghn", files: ["src/server/shipping.ts"] },
  { id: "invoices", name: "Hóa đơn", flag: "invoices", files: ["src/server/invoice.ts"] },
  { id: "membership", name: "Thành viên / điểm", flag: "membership", files: ["src/server/membership.ts"] },
  { id: "compare", name: "So sánh sản phẩm", flag: "compare", files: ["src/app/so-sanh"] },
  { id: "sell-kg", name: "Bán theo kg", flag: "sellByWeight", files: ["src/types/index.ts"] },
  { id: "booking", name: "Đặt lịch", flag: "booking", files: ["src/app/dat-lich"] },
  { id: "warehouse", name: "Đa kho", flag: "multiWarehouse", files: ["src/server/warehouse.ts"] },
  { id: "excel", name: "Excel nhập/xuất", flag: "excel", files: ["src/server/excel.ts"] },
  { id: "momo", name: "MoMo", included: true, files: ["src/server/momo.ts"] },
  { id: "sepay", name: "SePay đối soát CK", included: true, files: ["src/server/sepay.ts"] },
  { id: "vietqr", name: "VietQR chuyển khoản", included: true, files: ["src/lib/format.ts"] },
  { id: "giftcard", name: "Thẻ quà tặng", included: true, files: ["src/server/giftcard.ts", "src/app/admin/qua-tang"] },
  { id: "returns", name: "Đổi/trả hàng", included: true, files: ["src/server/returns.ts", "src/app/admin/tra-hang"] },
  { id: "refunds", name: "Hoàn tiền", included: true, files: ["src/server/refunds.ts", "src/app/admin/hoan-tien"] },
  { id: "order-events", name: "Nhật ký đơn", included: true, files: ["src/server/order-events.ts"] },
  { id: "webhooks-out", name: "Webhook đi", included: true, files: ["src/server/webhooks.ts", "src/app/admin/webhooks"] },
  { id: "address-book", name: "Sổ địa chỉ", included: true, files: ["src/app/api/addresses/route.ts"] },
  { id: "review-moderation", name: "Duyệt đánh giá", included: true, files: ["src/app/admin/danh-gia"] },
  { id: "bundles", name: "Combo", flag: "bundles", files: ["src/server/bundle.ts", "src/app/combo"] },
  { id: "abandoned", name: "Nhắc giỏ bỏ quên", included: true, files: ["src/server/abandoned.ts", "src/app/api/cron/abandoned-cart"] },
] as const;
