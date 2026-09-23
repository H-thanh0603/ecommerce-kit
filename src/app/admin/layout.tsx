import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Lớp 2 sau proxy: phủ ALS theo Host TRƯỚC requireAdmin (T5) — enterWith chạy trực tiếp trong frame layout.
  enterTenant(await resolveRequestTenant());
  // Lớp 2 sau proxy: layout admin tự verify session (không tin mỗi middleware).
  const admin = await requireAdmin();
  if (!admin) redirect("/dang-nhap?next=/admin");
  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminNav />
      <div className="min-w-0 flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
