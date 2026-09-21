import { notFound } from "next/navigation";
import { getInvoiceByNumber } from "@/server/invoice";
import { money } from "@/lib/format";
import { siteConfig } from "@/config/site";

export default async function InvoicePrint({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const data = await getInvoiceByNumber(decodeURIComponent(number));
  if (!data) notFound();
  const { invoice, order } = data;
  return (
    <div className="mx-auto max-w-2xl bg-white px-8 py-10 text-sm print:p-0">
      <p className="text-xs uppercase tracking-widest text-muted">Hóa đơn</p>
      <h1 className="font-serif text-3xl text-primary">{invoice.number}</h1>
      <p className="mt-2">{siteConfig.brand.name} · {siteConfig.brand.address}</p>
      <p className="mt-4">Khách: {invoice.buyerName} {invoice.buyerTax ? `· MST ${invoice.buyerTax}` : ""}</p>
      {invoice.buyerAddress && <p>Địa chỉ: {invoice.buyerAddress}</p>}
      <p>Đơn {order.code} · {order.createdAt}</p>
      <ul className="mt-6 space-y-1">
        {order.items.map((i) => (
          <li key={i.productId + i.variantLabel} className="flex justify-between">
            <span>{i.name} × {i.quantity}</span>
            <span>{money(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-muted">Tiền hàng (chưa VAT) {money(order.total - invoice.vatAmount)}</p>
      <p className="text-muted">VAT {invoice.taxRate}% {money(invoice.vatAmount)}</p>
      <p className="mt-1 font-medium">Tổng {money(order.total)}</p>
      <p className="mt-8 text-xs text-muted print:hidden">Ctrl+P / Cmd+P để in.</p>
    </div>
  );
}
