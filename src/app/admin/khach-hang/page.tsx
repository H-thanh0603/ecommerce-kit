import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";
import { listCustomers } from "@/server/commerce";

export default async function AdminCustomers() {
  enterTenant(await resolveRequestTenant());
  const rows = await listCustomers();
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-serif text-3xl text-primary">Khách hàng</h1>
      <p className="mt-2 text-sm text-muted">{rows.length} tài khoản khách</p>
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
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.memberTier}</td>
                <td className="px-4 py-3">{u.points}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/don-hang?q=${encodeURIComponent(u.email)}`} className="underline">
                    {u.orderCount}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{u.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
