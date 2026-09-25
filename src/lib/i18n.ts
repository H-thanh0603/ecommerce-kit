/**
 * i18n scaffold — vi-VN mặc định. Thêm ngôn ngữ = thêm file dict + locale vào LOCALES.
 * Không dep ngoài — lookup thuần. Đa số UI string đang hard-code VI;
 * refactor dần sang t() cho các màn dùng chung (checkout, account).
 *
 * Locale resolution: cookie `ek-lang` > Accept-Language > default "vi".
 * Tenant override: SiteSetting.i18n.defaultLocale (Part 3 wire).
 */

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";

type Dict = Record<string, string>;

const vi: Dict = {
  "nav.products": "Sản phẩm",
  "nav.cart": "Giỏ hàng",
  "nav.account": "Tài khoản",
  "nav.login": "Đăng nhập",
  "nav.wishlist": "Yêu thích",
  "nav.compare": "So sánh",
  "nav.journal": "Journal",
  "nav.booking": "Đặt lịch",
  "nav.contact": "Liên hệ",
  "common.search": "Tìm sản phẩm",
  "common.addToCart": "Thêm vào giỏ",
  "common.outOfStock": "Hết hàng",
  "common.loading": "Đang tải",
  "common.error": "Đã có sự cố",
  "common.retry": "Thử lại",
  "common.all": "Tất cả",
  "common.seeMore": "Xem thêm",
  "checkout.title": "Thanh toán",
  "checkout.placeOrder": "Đặt hàng",
  "checkout.name": "Họ tên",
  "checkout.phone": "Số điện thoại",
  "checkout.address": "Địa chỉ",
  "checkout.note": "Ghi chú",
  "checkout.email": "Email",
  "checkout.payment": "Phương thức thanh toán",
  "checkout.shipping": "Phí vận chuyển",
  "checkout.subtotal": "Tạm tính",
  "checkout.total": "Tổng",
  "checkout.discount": "Giảm giá",
  "cart.title": "Giỏ hàng",
  "cart.empty": "Giỏ hàng trống",
  "cart.checkout": "Thanh toán",
  "cart.continue": "Tiếp tục mua sắm",
};

const en: Dict = {
  "nav.products": "Products",
  "nav.cart": "Cart",
  "nav.account": "Account",
  "nav.login": "Sign in",
  "nav.wishlist": "Wishlist",
  "nav.compare": "Compare",
  "nav.journal": "Journal",
  "nav.booking": "Booking",
  "nav.contact": "Contact",
  "common.search": "Search products",
  "common.addToCart": "Add to cart",
  "common.outOfStock": "Out of stock",
  "common.loading": "Loading",
  "common.error": "Something went wrong",
  "common.retry": "Try again",
  "common.all": "All",
  "common.seeMore": "See more",
  "checkout.title": "Checkout",
  "checkout.placeOrder": "Place order",
  "checkout.name": "Full name",
  "checkout.phone": "Phone",
  "checkout.address": "Address",
  "checkout.note": "Note",
  "checkout.email": "Email",
  "checkout.payment": "Payment method",
  "checkout.shipping": "Shipping",
  "checkout.subtotal": "Subtotal",
  "checkout.total": "Total",
  "checkout.discount": "Discount",
  "cart.title": "Cart",
  "cart.empty": "Your cart is empty",
  "cart.checkout": "Checkout",
  "cart.continue": "Continue shopping",
};

const DICTS: Record<Locale, Dict> = { vi, en };

/** Lookup key trong dict locale, fallback vi rồi trả về key. */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
  let s = dict[key] ?? DICTS[DEFAULT_LOCALE][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function isLocale(x: string | null | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}

/** Parse Accept-Language: "vi,en-US;q=0.9,en;q=0.8" → "vi". */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase().split("-")[0];
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
