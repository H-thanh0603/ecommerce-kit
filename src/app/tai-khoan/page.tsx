"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { money, formatDate } from "@/lib/format";
import { ReturnForm } from "@/components/account/ReturnForm";
import type { Order } from "@/types";

const statusLabel: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

export default function AccountPage() {
  const { user, logout, ready } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [member, setMember] = useState<{ points: number; tierLabel: string } | null>(null);
  const [dataMsg, setDataMsg] = useState("");
  const [dataPending, setDataPending] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]));
    fetch("/api/member")
      .then((r) => r.json())
      .then((d) => setMember(d.member))
      .catch(() => {});
  }, [user]);

  const exportData = async () => {
    if (dataPending) return;
    setDataPending(true);
    setDataMsg("");
    try {
      const res = await fetch("/api/account");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `du-lieu-ca-nhan-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataMsg("Đã tải dữ liệu của bạn (JSON).");
    } catch {
      setDataMsg("Xuất thất bại — thử lại.");
    } finally {
      setDataPending(false);
    }
  };

  const deleteAccount = async () => {
    if (dataPending || confirmText !== "XOA") return;
    setDataPending(true);
    setDataMsg("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "err");
      }
      await logout();
      router.push("/");
      router.refresh();
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Xóa thất bại.");
      setDataPending(false);
    }
  };

  if (!ready) return <p className="px-4 py-20 text-center text-muted">Đang tải…</p>;
  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-serif text-3xl text-primary">Bạn chưa đăng nhập</h1>
        <Link href="/dang-nhap" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm text-white">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const mine = orders;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-4xl text-primary">Xin chào, {user.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {user.email}
            {member ? ` · Hạng ${member.tierLabel} · ${member.points} điểm` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <Link href="/admin" className="rounded-full bg-primary px-4 py-2 text-sm text-white">
              Vào admin
            </Link>
          )}
          <button onClick={() => logout()} className="rounded-full border border-line px-4 py-2 text-sm">
            Đăng xuất
          </button>
        </div>
      </div>

      <h2 className="mt-10 font-medium">Đơn gần đây</h2>
      <ul className="mt-4 space-y-3">
        {mine.map((o) => (
          <li key={o.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{o.code}</p>
              <p className="text-sm text-muted">{statusLabel[o.status]}</p>
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatDate(o.createdAt)} · {o.items.length} món · {money(o.total)}
            </p>
          </li>
        ))}
      </ul>

      <ReturnForm orders={mine} email={user.email} />

      {user.role !== "admin" && (
        <section className="mt-12 rounded-2xl border border-line bg-white p-5" aria-labelledby="privacy-sec">
          <h2 id="privacy-sec" className="font-medium">Quyền riêng tư dữ liệu</h2>
          <p className="mt-1 text-sm text-muted">
            Tải bản sao dữ liệu cá nhân, hoặc yêu cầu ẩn danh hóa tài khoản. Đơn hàng đã giao vẫn giữ ở dạng
            không gắn tên để phục vụ kế toán.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={exportData}
              disabled={dataPending}
              className="rounded-full border border-line px-4 py-2 text-sm disabled:opacity-60"
            >
              {dataPending ? "Đang xử lý…" : "Xuất dữ liệu (JSON)"}
            </button>
            <button
              onClick={() => setShowDelete((v) => !v)}
              aria-expanded={showDelete}
              className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700"
            >
              {showDelete ? "Đóng" : "Xóa / ẩn danh hóa"}
            </button>
          </div>
          {showDelete && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
              <p className="text-red-800">
                Hành động không hoàn tác: ẩn danh email/tên/địa chỉ, hủy mọi session. Nhập{" "}
                <strong>XOA</strong> để xác nhận.
              </p>
              <label htmlFor="del-confirm" className="sr-only">Gõ XOA để xác nhận</label>
              <input
                id="del-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="XOA"
                className="mt-2 w-40 rounded-lg border border-red-300 px-3 py-2 text-sm"
                autoComplete="off"
              />
              <button
                onClick={deleteAccount}
                disabled={confirmText !== "XOA" || dataPending}
                className="ml-3 mt-2 rounded-full bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          )}
          <p role="status" aria-live="polite" className="mt-2 text-sm text-muted">
            {dataMsg}
          </p>
        </section>
      )}
    </div>
  );
}
