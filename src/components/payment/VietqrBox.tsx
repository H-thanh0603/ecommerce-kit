"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

type Props = {
  code: string;
  total: number;
  qrUrl: string;
  bank: { bank: string; accountName: string; accountNumber: string };
  /** Email đặt đơn — chỉ để đối chiếu quyền dò giao dịch (guest). */
  email?: string;
};

/** QR chuyển khoản cho đơn + nút "Tôi đã chuyển khoản" (dò giao dịch qua SePay). */
export default function VietqrBox({ code, total, qrUrl, bank, email }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/vietqr/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email: email || guestEmail || undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; paid?: boolean; message?: string };
      if (data.paid) {
        setMsg("Đã xác nhận thanh toán — cảm ơn bạn!");
        router.refresh();
      } else {
        setMsg(data.message || "Chưa thấy giao dịch — thử lại sau ít phút");
      }
    } catch {
      setMsg("Lỗi mạng — thử lại");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-5 text-left">
      <h2 className="font-medium">Thanh toán qua VietQR</h2>
      <Image
        src={qrUrl}
        alt="VietQR chuyển khoản"
        width={200}
        height={200}
        className="mx-auto mt-3 rounded-lg bg-white p-2"
      />
      <div className="mt-2 space-y-0.5 text-sm text-muted">
        <p className="text-center text-base font-medium text-ink">{money(total)}</p>
        <p>{bank.bank}</p>
        <p>{bank.accountName}</p>
        <p>{bank.accountNumber}</p>
        <p className="mt-1">
          Nội dung chuyển khoản: <span className="font-medium text-ink">{code}</span> (ghi đúng mã đơn để tự động đối soát)
        </p>
      </div>
      {!email && (
        <input
          type="email"
          required
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          placeholder="Email đặt đơn (để đối chiếu)"
          className="mt-4 w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="mt-4 w-full rounded-full bg-primary py-2.5 text-sm text-white disabled:opacity-60"
      >
        {pending ? "Đang dò giao dịch…" : "Tôi đã chuyển khoản"}
      </button>
      {msg && (
        <p role="status" className="mt-2 text-xs text-muted">
          {msg}
        </p>
      )}
    </div>
  );
}
