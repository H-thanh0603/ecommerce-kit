"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type SetupRes = {
  ok: boolean;
  secret: string;
  otpauth: string;
  recovery: string[];
  pending?: boolean;
};

/**
 * UI bật/tắt MFA TOTP cho admin — cờ feature `mfa` default OFF ở /admin/cai-dat.
 */
export default function AdminMfaPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<SetupRes | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/mfa")
      .then(async (r) => {
        if (r.status === 404) {
          setMsg("MFA đang tắt — bật cờ `mfa` ở Cài đặt trước.");
          setEnabled(false);
          return null;
        }
        if (!r.ok) throw new Error();
        const j = await r.json();
        setEnabled(Boolean(j.mfaEnabled));
        return j;
      })
      .catch(() => setMsg("Không tải được trạng thái MFA"));
  }, []);

  useEffect(() => {
    // deferred — tránh setState đồng bộ trong effect (react-hooks/set-state-in-effect)
    const id = requestAnimationFrame(() => load());
    return () => cancelAnimationFrame(id);
  }, [load]);

  const startSetup = async () => {
    if (pending) return;
    setPending(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || "Setup fail");
      setSetup(j);
      setMsg("Quét QR/URI bằng app authenticator rồi nhập mã 6 số.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lỗi setup");
    } finally {
      setPending(false);
    }
  };

  const verifySetup = async () => {
    if (pending || !setup) return;
    setPending(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          secret: setup.secret,
          code,
          recovery: setup.recovery,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || "Mã sai");
      setEnabled(true);
      setSetup(null);
      setCode("");
      setMsg(`Đã bật MFA. Lưu recovery codes (hiện 1 lần): ${j.recovery?.join(", ") || ""}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xác nhận thất bại");
    } finally {
      setPending(false);
    }
  };

  const disable = async () => {
    if (pending || !password) return;
    setPending(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", password }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || "Không tắt được");
      setEnabled(false);
      setPassword("");
      setMsg("Đã tắt MFA.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex justify-between">
        <h1 className="font-serif text-3xl text-primary">MFA admin (TOTP)</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>

      <p role="status" aria-live="polite" className="mt-3 text-sm text-muted">
        {msg}
      </p>

      {enabled === null && !msg && <p className="mt-4 text-sm text-muted">Đang tải…</p>}

      {enabled === false && !setup && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <p className="text-sm text-muted">
            Chưa bật. Sau khi bật, đăng nhập admin cần thêm mã từ app Authenticator.
          </p>
          <button
            onClick={startSetup}
            disabled={pending}
            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm text-white disabled:opacity-60"
          >
            {pending ? "Đang chuẩn bị…" : "Bắt đầu bật MFA"}
          </button>
        </div>
      )}

      {setup && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5 space-y-3">
          <p className="text-sm">
            Nhập secret vào authenticator <strong>hoặc</strong> mở link otpauth:
          </p>
          <code className="block break-all rounded bg-line/40 p-3 text-xs">{setup.otpauth}</code>
          <p className="text-xs text-muted">
            Recovery codes (ghi ra giấy, hiển thị lại sau khi xác nhận):{" "}
            <strong>{setup.recovery.join(" · ")}</strong>
          </p>
          <div>
            <label htmlFor="mfa-code" className="sr-only">Mã TOTP 6 số</label>
            <input
              id="mfa-code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-40 rounded-xl border border-line px-3 py-2.5 text-sm"
              autoComplete="one-time-code"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={verifySetup}
              disabled={pending || code.length !== 6}
              className="rounded-full bg-primary px-5 py-2.5 text-sm text-white disabled:opacity-60"
            >
              {pending ? "Đang xác nhận…" : "Xác nhận & bật"}
            </button>
            <button onClick={() => setSetup(null)} className="rounded-full border border-line px-4 py-2 text-sm">
              Huỷ
            </button>
          </div>
        </div>
      )}

      {enabled === true && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5 space-y-3">
          <p className="text-sm text-primary">MFA đang bật.</p>
          <div>
            <label htmlFor="mfa-pass" className="sr-only">Mật khẩu để tắt MFA</label>
            <input
              id="mfa-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu admin"
              className="w-full max-w-xs rounded-xl border border-line px-3 py-2.5 text-sm"
              autoComplete="current-password"
            />
          </div>
          <button
            onClick={disable}
            disabled={pending || !password}
            className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
          >
            {pending ? "Đang tắt…" : "Tắt MFA"}
          </button>
        </div>
      )}
    </div>
  );
}
