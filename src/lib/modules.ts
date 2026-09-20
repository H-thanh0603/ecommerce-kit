/**
 * Catalog module có sẵn trong khung.
 * Khi làm cho khách: copy một module gần nhất → đổi UI/logic → đăng ký vào đây.
 */
export const moduleCatalog = [
  {
    id: "core-catalog",
    name: "Danh mục & sản phẩm",
    included: true,
    files: ["src/app/san-pham", "src/components/product"],
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
    files: ["src/app/dang-nhap", "src/app/tai-khoan", "src/lib/auth.tsx"],
  },
  {
    id: "core-admin",
    name: "Admin quản trị",
    included: true,
    files: ["src/app/admin"],
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
    files: ["src/components/home/FlashSale.tsx"],
  },
  {
    id: "blog",
    name: "Tin tức / journal",
    flag: "blog",
    files: ["src/app/tin-tuc"],
  },
  {
    id: "live-chat",
    name: "Chat Zalo / live",
    flag: "liveChat",
    files: ["src/components/layout/LiveChat.tsx"],
  },
] as const;
