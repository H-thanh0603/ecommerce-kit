import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminNav />
      <div className="min-w-0 flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
