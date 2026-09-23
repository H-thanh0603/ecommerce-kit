"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    try {
      const email = String(new FormData(e.currentTarget).get("email") || "");
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMsg(data.message);
    } catch {
      setMsg("Lỗi mạng — thử lại sau");
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-primary">Quên mật khẩu</h1>
      <p className="mt-2 text-sm text-muted">
        Nếu email tồn tại, bạn sẽ nhận được link đặt lại (hiệu lực 15 phút).
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-2xl border border-line bg-white p-5">
        <div>
          <label htmlFor="fg-email" className="sr-only">Email</label>
          <input id="fg-email" required type="email" name="email" autoComplete="email" placeholder="Email" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        </div>
        <button disabled={pending} className="w-full rounded-full bg-primary py-3 text-sm text-white disabled:opacity-60">
          {pending ? "Đang gửi…" : "Gửi link"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-muted">{msg}</p>
      </form>
      <Link href="/dang-nhap" className="mt-4 inline-block text-sm underline">Quay lại đăng nhập</Link>
    </div>
  );
}
