"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [msg, setMsg] = useState("");
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setMsg(data.message);
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-primary">Quên mật khẩu</h1>
      <p className="mt-2 text-sm text-muted">Link gửi vào MailLog (dev) / email khi có SMTP.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-2xl border border-line bg-white p-5">
        <input required type="email" name="email" placeholder="Email" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <button className="w-full rounded-full bg-primary py-3 text-sm text-white">Gửi link</button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </form>
      <Link href="/dang-nhap" className="mt-4 inline-block text-sm underline">Quay lại đăng nhập</Link>
    </div>
  );
}
