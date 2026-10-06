import type { FeatureKey } from "@/config/site";

/**
 * Nguồn chân lý duy nhất cho điều hướng admin — AdminNav (sidebar) và
 * CommandPalette (⌘K) cùng đọc từ đây, thêm trang mới chỉ sửa 1 chỗ.
 */
export type AdminNavItem = { href: string; label: string; flag?: FeatureKey };

export const adminNavGroups: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "Bán hàng",
    items: [
      { href: "/admin", label: "Tổng quan" },
      { href: "/admin/don-hang", label: "Đơn hàng" },
      { href: "/admin/san-pham", label: "Sản phẩm" },
      { href: "/admin/danh-muc", label: "Danh mục" },
      { href: "/admin/khach-hang", label: "Khách hàng" },
      { href: "/admin/ma-giam", label: "Mã giảm" },
      { href: "/admin/combo", label: "Combo", flag: "bundles" },
      { href: "/admin/lien-he", label: "Hộp thư" },
      { href: "/admin/tin-tuc", label: "Bài viết", flag: "blog" },
    ],
  },
  {
    title: "Sau bán",
    items: [
      { href: "/admin/danh-gia", label: "Đánh giá", flag: "reviews" },
      { href: "/admin/tra-hang", label: "Đổi / trả" },
      { href: "/admin/hoan-tien", label: "Hoàn tiền" },
      { href: "/admin/qua-tang", label: "Thẻ quà" },
    ],
  },
  {
    title: "Kho",
    items: [
      { href: "/admin/dat-lich", label: "Đặt lịch", flag: "booking" },
      { href: "/admin/kho", label: "Kho", flag: "multiWarehouse" },
      { href: "/admin/hoa-don", label: "Hóa đơn", flag: "invoices" },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/admin/ai", label: "AI Agent", flag: "aiAgent" },
      { href: "/admin/mfa", label: "MFA", flag: "mfa" },
      { href: "/admin/webhooks", label: "Webhook" },
      { href: "/admin/nhan-vien", label: "Nhân viên" },
      { href: "/admin/cai-dat", label: "Cài đặt" },
    ],
  },
];
