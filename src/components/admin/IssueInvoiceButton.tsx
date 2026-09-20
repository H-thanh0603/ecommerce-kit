"use client";

export function IssueInvoiceButton({ orderId }: { orderId: string }) {
  return (
    <button
      className="mt-2 text-xs underline"
      onClick={async () => {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (data.invoice?.number) window.location.href = `/hoa-don/${data.invoice.number}`;
        else alert(data.message || "Không xuất được");
      }}
    >
      Xuất hóa đơn
    </button>
  );
}
