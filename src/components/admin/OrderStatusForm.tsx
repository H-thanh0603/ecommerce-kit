"use client";

import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/types";

const options: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã huỷ" },
];

export function OrderStatusForm({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter();
  return (
    <select
      defaultValue={status}
      className="rounded-full border border-line bg-white px-3 py-1.5 text-sm"
      onChange={async (e) => {
        await fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: e.target.value }),
        });
        router.refresh();
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
