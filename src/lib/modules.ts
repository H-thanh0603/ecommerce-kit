/**
 * Catalog module có sẵn trong khung.
 * Khi làm cho khách: copy một module gần nhất → đổi UI/logic → đăng ký vào đây.
 */
export const moduleCatalog = [
  {
    id: "core-catalog",
    name: "Danh mục & sản phẩm",
    included: true,
    files: ["src/app/san-pham", "src/server/commerce.ts"],
  },
  {
    id: "core-cart",
    name: "Giỏ hàng & checkout",
    included: true,
    files: ["src/app/gio-hang", "src/app/thanh-toan", "src/lib/cart.tsx"],
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
] as const;
