import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";
import { listInvoices } from "@/server/invoice";

export default async function AdminInvoices() {
  enterTenant(await resolveRequestTenant());
  const invoices = await listInvoices();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex justify-between"><h1 className="font-serif text-3xl text-primary">Hóa đơn</h1><Link href="/admin" className="text-sm text-muted">← Tổng quan</Link></div>
      <ul className="mt-6 space-y-2">
        {invoices.map((i) => (
          <li key={i.id} className="flex justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm">
            <span>{i.number} · {i.buyerName} · {i.order.code}</span>
            <Link href={`/hoa-don/${i.number}`} className="underline">In</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
