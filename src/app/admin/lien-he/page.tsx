import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";
import { listLeads, listNewsletter } from "@/server/commerce";
import { listMailLog } from "@/server/mail";

export default async function AdminInbox() {
  enterTenant(await resolveRequestTenant());
  const [leads, news, mail] = await Promise.all([listLeads(), listNewsletter(), listMailLog(20)]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex justify-between"><h1 className="font-serif text-3xl text-primary">Hộp thư</h1><Link href="/admin" className="text-sm text-muted">← Dashboard</Link></div>
      <h2 className="mt-8 font-medium">Liên hệ</h2>
      <ul className="mt-3 space-y-2">
        {leads.map((l) => (
          <li key={l.id} className="rounded-xl border border-line bg-white p-4 text-sm">
            <p className="font-medium">{l.name} · {l.email} · {l.phone}</p>
            <p className="mt-1 text-muted">{l.message}</p>
          </li>
        ))}
        {leads.length === 0 && <p className="text-sm text-muted">Chưa có lead.</p>}
      </ul>
      <h2 className="mt-8 font-medium">Newsletter</h2>
      <ul className="mt-3 text-sm text-muted">
        {news.map((n) => <li key={n.id}>{n.email}</li>)}
      </ul>
      <h2 className="mt-8 font-medium">Email đã ghi (MailLog)</h2>
      <ul className="mt-3 space-y-2">
        {mail.map((m) => (
          <li key={m.id} className="rounded-xl border border-line bg-white p-3 text-sm">
            <p className="font-medium">{m.subject}</p>
            <p className="text-muted">{m.to} — {m.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
