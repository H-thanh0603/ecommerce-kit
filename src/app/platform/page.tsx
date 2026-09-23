import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/server/platform";
import { platformDb } from "@/server/platform-db";
import { TenantCreateForm } from "./tenant-create-form";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const admin = await requirePlatformAdmin();
  if (!admin) redirect("/platform/dang-nhap");
  const tenants = await platformDb.tenant.findMany({
    include: { domains: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Quản lý Platform</h1>
        <form
          action={async () => {
            "use server";
            const { cookies } = await import("next/headers");
            const { PLATFORM_COOKIE } = await import("@/server/platform-auth");
            (await cookies()).delete(PLATFORM_COOKIE);
          }}
        >
          <button type="submit" className="text-sm text-muted underline">
            Đăng xuất
          </button>
        </form>
      </div>
      <p className="mt-2 text-sm text-muted">
        Đăng nhập: {admin.email} — {tenants.length} tenant (bảng platform).
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Danh sách tenant</h2>
        {tenants.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Chưa có tenant nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {tenants.map((t) => (
              <li key={t.id} className="py-3 text-sm">
                <div className="flex items-center gap-2">
                  <code className="font-medium text-primary">{t.slug}</code>
                  <span>{t.name}</span>
                  {!t.active && <span className="text-xs text-muted">(tạm dừng)</span>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {t.domains.map((d) => d.host).join(", ") || "chưa gán domain"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TenantCreateForm />
    </div>
  );
}
