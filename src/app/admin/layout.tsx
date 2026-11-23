import { redirect } from "next/navigation";
import { requireStaff } from "@/server/auth";
import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { AdminNav } from "@/components/admin/AdminNav";
import { CommandPalette } from "@/components/admin/CommandPalette";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Lớp 2 sau proxy: phủ ALS theo Host TRƯỚC requireAdmin (T5) — enterWith chạy trực tiếp trong frame layout.
  enterTenant(await resolveRequestTenant());
  // Lớp 2 sau proxy: layout admin tự verify session (không tin mỗi middleware).
  // Nhân viên (kho/cskh/marketing) vào được /admin — từng trang/API tự chặn theo ma trận.
  const admin = await requireStaff();
  if (!admin) redirect("/dang-nhap?next=/admin");
  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <AdminNav role={admin.role} />
      <div className="min-w-0 flex-1 overflow-x-auto">{children}</div>
      {/* Client component — tự kiểm tra flag commandPalette (isEnabled client-only). */}
      <CommandPalette role={admin.role} />
    </div>
  );
}
