/**
 * Ma trận quyền admin theo module — nguồn chân lý duy nhất cho cả 3 lớp:
 * sidebar (AdminNav), command palette (CommandPalette) và API routes
 * (requireStaff). Client-safe: KHÔNG import module chứa Prisma vào đây.
 *
 * Vai: "admin" = toàn quyền. Nhân viên chi tiết (kho/cskh/marketing) chỉ vào
 * được các trang liệt kê. Enforce thật nằm ở API routes (BE-001) — nav ẩn nút
 * chỉ là UX.
 */
import type { StaffRole } from "@/types";

export const STAFF_ROLES = ["kho", "cskh", "marketing"] as const;

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  kho: "Kho vận",
  cskh: "Chăm sóc khách",
  marketing: "Marketing",
};

/** Các trang admin mỗi vai nhân viên được vào. "/admin" (tổng quan) không cấp cho nhân viên — dashboard chứa KPI doanh thu. */
const ROLE_PATHS: Record<StaffRole, string[]> = {
  kho: [
    "/admin/don-hang",
    "/admin/san-pham",
    "/admin/danh-muc",
    "/admin/kho",
    "/admin/hoa-don",
  ],
  cskh: [
    "/admin/don-hang",
    "/admin/khach-hang",
    "/admin/tra-hang",
    "/admin/hoan-tien",
    "/admin/danh-gia",
    "/admin/lien-he",
    "/admin/dat-lich",
  ],
  marketing: [
    "/admin/san-pham",
    "/admin/danh-muc",
    "/admin/ma-giam",
    "/admin/combo",
    "/admin/qua-tang",
    "/admin/tin-tuc",
    "/admin/lien-he",
  ],
};

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

/** Trang đầu tiên trong danh sách — landing khi nhân viên đăng nhập xong. */
export function staffLanding(role: StaffRole): string {
  return ROLE_PATHS[role][0] ?? "/admin";
}

export function canAccessAdminArea(role: string, rawHref: string): boolean {
  if (role === "admin") return true;
  if (!isStaffRole(role)) return false;
  const paths = ROLE_PATHS[role];
  // Bỏ querystring — deep-link kiểu /admin/don-hang?q=... khớp theo path.
  const href = rawHref.split("?")[0];
  if (href === "/admin") return false;
  return paths.some((p) => href === p || href.startsWith(`${p}/`));
}
