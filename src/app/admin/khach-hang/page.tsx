import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";
import { listCustomers } from "@/server/commerce";
import { siteConfig } from "@/config/site";
import { btnGhost } from "@/components/admin/buttons";

function tierLabel(tier: string) {
  const row = siteConfig.membership[tier as keyof typeof siteConfig.membership];
  return row && typeof row === "object" && "label" in row ? row.label : tier;
}

function viDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export default async function AdminCustomers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  enterTenant(await resolveRequestTenant());
  const sp = await searchParams;
  const q = (sp.q || "").trim().toLowerCase();
  const all = await listCustomers();
  const rows = q ? all.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q)) : all;
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-serif text-3xl text-primary">Khách hàng</h1>
      <p className="mt-2 text-sm text-muted">{rows.length} tài khoản khách</p>
      <form className="mt-4">
        <input
          name="q"
          defaultValue={sp.q || ""}
          placeholder="Tìm tên hoặc email"
          aria-label="Tìm khách"
          className="w-full max-w-sm rounded-full border border-line bg-white px-4 py-2 text-sm"
        />
      </form>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Hạng</th>
              <th className="px-4 py-3">Điểm</th>
              <th className="px-4 py-3">Đơn</th>
              <th className="px-4 py-3">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-muted">
                  {q ? "Không có khách khớp." : "Chưa có khách. Khách xuất hiện sau khi đăng ký tài khoản."}
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{tierLabel(u.memberTier)}</td>
                <td className="px-4 py-3">{u.points}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/don-hang?q=${encodeURIComponent(u.email)}`} className={btnGhost}>
                    {u.orderCount} đơn
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{viDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
