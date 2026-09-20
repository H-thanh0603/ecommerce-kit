"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") || "");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sp.get("email"), token: sp.get("token"), password }),
    });
    const data = await res.json();
    setMsg(data.message);
    if (res.ok) router.push("/dang-nhap");
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-primary">Đặt lại mật khẩu</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-2xl border border-line bg-white p-5">
        <input required type="password" name="password" minLength={6} placeholder="Mật khẩu mới" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        <button className="w-full rounded-full bg-primary py-3 text-sm text-white">Lưu</button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </form>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
