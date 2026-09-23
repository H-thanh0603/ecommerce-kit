"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function readHashParams() {
  const raw = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(raw);
}

function ResetForm() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  // Token nằm ở fragment (#…) — đọc async sau paint để tránh setState đồng bộ trong effect.
  useEffect(() => {
    let alive = true;
    const id = requestAnimationFrame(() => {
      if (!alive) return;
      const p = readHashParams();
      setEmail(p.get("email") || "");
      setToken(p.get("token") || "");
    });
    return () => {
      alive = false;
      cancelAnimationFrame(id);
    };
  }, []);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const password = String(new FormData(e.currentTarget).get("password") || "");
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      setMsg(data.message);
      if (res.ok) {
        history.replaceState(null, "", window.location.pathname);
        router.push("/dang-nhap");
      }
    } catch {
      setMsg("Lỗi mạng — thử lại sau");
    } finally {
      setPending(false);
    }
  };
  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-serif text-4xl text-primary">Đặt lại mật khẩu</h1>
        <p className="mt-4 text-sm text-muted">
          Link không hợp lệ hoặc đã hết hạn — hãy yêu cầu link mới.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl text-primary">Đặt lại mật khẩu</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-2xl border border-line bg-white p-5">
        <div>
          <label htmlFor="rs-pass" className="sr-only">Mật khẩu mới</label>
          <input id="rs-pass" required type="password" name="password" minLength={6} maxLength={72} autoComplete="new-password" placeholder="Mật khẩu mới" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" />
        </div>
        <button disabled={pending} className="w-full rounded-full bg-primary py-3 text-sm text-white disabled:opacity-60">
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-muted">{msg}</p>
      </form>
    </div>
  );
}

export default function ResetPage() {
  return <ResetForm />;
}
