/**
 * ============================================================
 *  CẤU HÌNH CỬA HÀNG — file chính để tuỳ biến theo khách hàng
 * ============================================================
 * Khi nhận dự án mới: clone repo → sửa file này trước.
 * Bật/tắt module bằng `features`. Đổi thương hiệu bằng `brand`.
 * Thanh toán thật (MoMo/VNPay) chỉ bật khi đã có khóa API.
 */

export const siteConfig = {
  brand: {
    name: "Atelier",
    tagline: "Chọn chậm. Dùng lâu.",
    description:
      "Cửa hàng trực tuyến bán sản phẩm chọn lọc — thời trang, nhà cửa và lifestyle.",
    email: "hello@atelier.vn",
    phone: "0901 234 567",
    hotline: "1900 1234",
    address: "12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    workingHours: "8:00 – 21:00 (T2–CN)",
    logoText: "Atelier",
  },

  /** Màu thương hiệu — đổi hex là đổi toàn site */
  theme: {
    primary: "#0F3D2E",
    primaryHover: "#0A2C21",
    accent: "#C45C26",
    ink: "#1C1917",
    muted: "#78716C",
    canvas: "#FAF7F2",
    card: "#FFFFFF",
    line: "#E7E0D6",
  },

  social: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    tiktok: "https://tiktok.com",
    youtube: "https://youtube.com",
    zalo: "https://zalo.me/0901234567",
  },

  nav: [
    { href: "/san-pham", label: "Sản phẩm" },
    { href: "/tin-tuc", label: "Journal", feature: "blog" as const },
    { href: "/so-sanh", label: "So sánh", feature: "compare" as const },
    { href: "/dat-lich", label: "Đặt lịch", feature: "booking" as const },
    { href: "/lien-he", label: "Liên hệ" },
  ],

  /**
   * Feature flags — bật module theo hợp đồng khách hàng.
   * Tắt flag = ẩn UI + bỏ logic phía storefront.
   */
  features: {
    search: true,
    wishlist: true,
    reviews: true,
    coupons: true,
    flashSale: true,
    blog: true,
    newsletter: true,
    productVariants: true,
    relatedProducts: true,
    stockBadge: true,
    guestCheckout: true,
    aiChatbot: true,
    aiAgent: true,
    compare: true,
    membership: true,
    invoices: true,
    excel: true,
    booking: true,
    sellByWeight: true,
    multiWarehouse: true,
    ghn: false,
  },

  membership: {
    dong: { min: 0, label: "Đồng" },
    bac: { min: 500, label: "Bạc" },
    vang: { min: 2000, label: "Vàng" },
    pointPerVnd: 1000,
    vndPerPoint: 10,
  },

  payments: {
    cod: { enabled: true, label: "Thanh toán khi nhận hàng (COD)" },
    bankTransfer: {
      enabled: true,
      label: "Chuyển khoản ngân hàng",
      bank: "Vietcombank",
      accountName: "CONG TY ATELIER",
      accountNumber: "0123456789",
    },
    momo: { enabled: false, label: "Ví MoMo" },
    vnpay: { enabled: false, label: "VNPay" },
    zalopay: { enabled: false, label: "ZaloPay" },
  },

  shipping: {
    freeFrom: 500_000,
    defaultFee: 30_000,
    innerCityFee: 20_000,
    estimatedDays: "2–4 ngày làm việc",
  },

  seo: {
    titleTemplate: "%s · Atelier",
    defaultTitle: "Atelier — Cửa hàng trực tuyến",
    defaultDescription:
      "Mua sắm thời trang, nhà cửa và lifestyle. Giao hàng toàn quốc, đổi trả 7 ngày.",
  },

  /** Email admin (mật khẩu seed: ADMIN_PASSWORD trong .env, mặc định admin123). */
  admin: {
    email: "admin@atelier.vn",
  },

  currency: {
    code: "VND",
    locale: "vi-VN",
  },
} as const;

export type SiteConfig = typeof siteConfig;
export type FeatureKey = keyof typeof siteConfig.features;

/** Kiểu cấu hình hiệu lực — đặt ở đây để component client import type an toàn (không kéo Prisma). */
export type EffectiveBrand = Record<keyof typeof siteConfig.brand, string>;
export type EffectiveTheme = Record<keyof typeof siteConfig.theme, string>;
export type EffectiveShipping = {
  freeFrom: number;
  defaultFee: number;
  innerCityFee: number;
  estimatedDays: string;
};
export type EffectiveFeatures = Record<FeatureKey, boolean>;
export type EffectiveSite = {
  brand: EffectiveBrand;
  theme: EffectiveTheme;
  shipping: EffectiveShipping;
  features: EffectiveFeatures;
  currency: { code: string; locale: string };
};

export function isEnabled(feature: FeatureKey): boolean {
  return Boolean(siteConfig.features[feature]);
}

export function enabledPayments() {
  return Object.entries(siteConfig.payments)
    .filter(([, v]) => v.enabled)
    .map(([key, v]) => ({ key, ...v }));
}
