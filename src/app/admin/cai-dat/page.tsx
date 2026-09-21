"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Payload = {
  brand: Record<string, string>;
  theme: Record<string, string>;
  shipping: { freeFrom: number; defaultFee: number; innerCityFee: number; estimatedDays: string };
  features: Record<string, boolean>;
  currency: { code: string; locale: string };
  announcement: { enabled: boolean; text: string };
  consent: { enabled: boolean; text: string };
};

const BRAND_FIELDS = [
  ["name", "Tên cửa hàng"],
  ["logoText", "Chữ logo"],
  ["tagline", "Slogan"],
  ["description", "Mô tả"],
  ["email", "Email"],
  ["phone", "SĐT"],
  ["hotline", "Hotline"],
  ["address", "Địa chỉ"],
  ["workingHours", "Giờ làm việc"],
] as const;

const THEME_FIELDS = [
  ["primary", "Màu chính"],
  ["primaryHover", "Màu chính (hover)"],
  ["accent", "Màu nhấn"],
  ["ink", "Màu chữ"],
  ["muted", "Màu chữ mờ"],
  ["canvas", "Màu nền"],
  ["card", "Màu thẻ"],
  ["line", "Màu viền"],
] as const;

export default function AdminSettings() {
  const [data, setData] = useState<Payload | null>(null);
  const [overKeys, setOverKeys] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((j) => {
        setData(j.effective);
        setOverKeys(Object.keys(j.overrides || {}));
      })
      .catch(() => setMsg("Không tải được cài đặt"));
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || "Lưu thất bại");
      setData(j.effective);
      setMsg("Đã lưu — brand/theme/ship áp dụng ngay, không cần rebuild.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-muted">{msg || "Đang tải…"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-primary">Cài đặt khung</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Dashboard
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted">
        Lưu vào DB, áp dụng ngay cho theme/brand/phí ship/tính tiền — không cần rebuild.
        {overKeys.length > 0 && (
          <span className="text-primary"> Đang ghi đè file: {overKeys.join(", ")}.</span>
        )}
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Thương hiệu</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {BRAND_FIELDS.map(([k, label]) => (
            <label key={k} className="grid gap-1 text-sm">
              <span className="text-muted">{label}</span>
              <input
                value={data.brand[k] || ""}
                onChange={(e) => setData({ ...data, brand: { ...data.brand, [k]: e.target.value } })}
                className="rounded-lg border border-line px-3 py-2"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Màu thương hiệu</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {THEME_FIELDS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 text-sm">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(data.theme[k] || "") ? data.theme[k] : "#000000"}
                onChange={(e) => setData({ ...data, theme: { ...data.theme, [k]: e.target.value } })}
                className="h-9 w-12 cursor-pointer rounded border border-line"
              />
              <span className="text-muted">
                {label} <code>{data.theme[k]}</code>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Vận chuyển</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["freeFrom", "defaultFee", "innerCityFee"] as const).map((k) => (
            <label key={k} className="grid gap-1 text-sm">
              <span className="text-muted">
                {k === "freeFrom" ? "Miễn phí từ (đ)" : k === "defaultFee" ? "Phí mặc định (đ)" : "Phí nội thành (đ)"}
              </span>
              <input
                type="number"
                min={0}
                value={data.shipping[k]}
                onChange={(e) =>
                  setData({ ...data, shipping: { ...data.shipping, [k]: Number(e.target.value) } })
                }
                className="rounded-lg border border-line px-3 py-2"
              />
            </label>
          ))}
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Thời gian giao dự kiến</span>
            <input
              value={data.shipping.estimatedDays}
              onChange={(e) => setData({ ...data, shipping: { ...data.shipping, estimatedDays: e.target.value } })}
              className="rounded-lg border border-line px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Tiền tệ</h2>
        <p className="mt-1 text-xs text-muted">
          Áp dụng ngay cho hóa đơn in; giá ngoài storefront theo bản build.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Mã tiền (VND, USD…)</span>
            <input
              value={data.currency.code}
              onChange={(e) => setData({ ...data, currency: { ...data.currency, code: e.target.value.toUpperCase() } })}
              className="rounded-lg border border-line px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Locale (vi-VN, en-US…)</span>
            <input
              value={data.currency.locale}
              onChange={(e) => setData({ ...data, currency: { ...data.currency, locale: e.target.value } })}
              className="rounded-lg border border-line px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Thông báo & cookie</h2>
        <div className="mt-3 grid gap-3">
          {(["announcement", "consent"] as const).map((k) => (
            <div key={k} className="grid gap-2 rounded-lg border border-line p-3">
              <label className="flex items-center justify-between text-sm">
                <span>{k === "announcement" ? "Thanh thông báo đầu trang" : "Banner đồng ý cookie (NĐ 13/2023)"}</span>
                <input
                  type="checkbox"
                  checked={Boolean(data[k]?.enabled)}
                  onChange={(e) => setData({ ...data, [k]: { ...data[k], enabled: e.target.checked } })}
                  className="h-4 w-4"
                />
              </label>
              <input
                value={data[k]?.text || ""}
                onChange={(e) => setData({ ...data, [k]: { ...data[k], text: e.target.value } })}
                placeholder={k === "announcement" ? "VD: Freeship đơn từ 500K hôm nay" : ""}
                className="rounded-lg border border-line px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Cờ tính năng</h2>
        <p className="mt-1 text-xs text-muted">
          Áp dụng ngay cho tính tiền/tồn kho/vận chuyển phía server. Ẩn/hiện giao diện vẫn đọc file lúc build —
          đổi flag giao diện xong cần deploy lại.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(data.features).map(([k, v]) => (
            <label key={k} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <span>{k}</span>
              <input
                type="checkbox"
                checked={Boolean(v)}
                onChange={(e) => setData({ ...data, features: { ...data.features, [k]: e.target.checked } })}
                className="h-4 w-4"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-primary px-6 py-2.5 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : "Lưu cài đặt"}
        </button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>
    </div>
  );
}
