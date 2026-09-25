"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { btnGhost, btnPrimary } from "@/components/admin/buttons";
import { defaultHome, siteConfig, type EffectiveHome, type EffectivePayments, type HomeBlock } from "@/config/site";

type Payload = {
  brand: Record<string, string>;
  theme: Record<string, string>;
  shipping: { freeFrom: number; defaultFee: number; innerCityFee: number; estimatedDays: string };
  features: Record<string, boolean>;
  currency: { code: string; locale: string };
  announcement: { enabled: boolean; text: string };
  consent: { enabled: boolean; text: string };
  payments: EffectivePayments;
  home: EffectiveHome;
};

const FEATURE_LABELS: Record<string, string> = {
  search: "Ô tìm kiếm",
  wishlist: "Yêu thích",
  reviews: "Đánh giá",
  coupons: "Mã giảm giá",
  bundles: "Combo",
  flashSale: "Flash sale",
  blog: "Tin tức",
  newsletter: "Đăng ký nhận tin",
  productVariants: "Biến thể sản phẩm",
  relatedProducts: "Sản phẩm liên quan",
  stockBadge: "Huy hiệu tồn kho",
  guestCheckout: "Mua không cần tài khoản",
  aiChatbot: "Chatbot",
  aiAgent: "AI Agent",
  compare: "So sánh",
  membership: "Hạng thành viên",
  invoices: "Hóa đơn",
  excel: "Xuất / nhập Excel",
  booking: "Đặt lịch",
  sellByWeight: "Bán theo kg",
  multiWarehouse: "Nhiều kho",
  ghn: "Giao hàng GHN",
  mfa: "Mã xác thực admin",
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
        <h1 className="font-serif text-3xl text-primary">Cài đặt</h1>
        <Link href="/admin" className="text-sm text-muted">
          ← Tổng quan
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
          Áp dụng ngay cho API/tính tiền/tồn kho/vận chuyển (server đọc DB). Một số điểm chạm UI nhỏ vẫn đọc file lúc build.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(data.features).map(([k, v]) => (
            <label key={k} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <span>{FEATURE_LABELS[k] ?? k}</span>
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

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Thanh toán</h2>
        <p className="mt-1 text-xs text-muted">Áp dụng ngay lúc khách thanh toán. MoMo và VNPay vẫn cần khóa trong máy chủ.</p>
        <div className="mt-3 grid gap-3">
          {(["cod", "momo", "vnpay", "zalopay"] as const).map((k) => (
            <label key={k} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
              <span>{(data.payments || siteConfig.payments)[k].label}</span>
              <input
                type="checkbox"
                checked={Boolean((data.payments || siteConfig.payments)[k].enabled)}
                onChange={(e) =>
                  setData({
                    ...data,
                    payments: {
                      ...(data.payments || siteConfig.payments),
                      [k]: { ...(data.payments || siteConfig.payments)[k], enabled: e.target.checked },
                    },
                  })
                }
              />
            </label>
          ))}
          <div className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-2">
            <label className="flex items-center justify-between text-sm sm:col-span-2">
              <span>Chuyển khoản</span>
              <input
                type="checkbox"
                checked={Boolean((data.payments || siteConfig.payments).bankTransfer.enabled)}
                onChange={(e) =>
                  setData({
                    ...data,
                    payments: {
                      ...(data.payments || siteConfig.payments),
                      bankTransfer: { ...(data.payments || siteConfig.payments).bankTransfer, enabled: e.target.checked },
                    },
                  })
                }
              />
            </label>
            {(
              [
                ["bank", "Ngân hàng"],
                ["shortCode", "Mã VietQR (VD VCB)"],
                ["accountName", "Chủ tài khoản"],
                ["accountNumber", "Số tài khoản"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="grid gap-1 text-sm">
                {label}
                <input
                  value={(data.payments || siteConfig.payments).bankTransfer[k]}
                  onChange={(e) =>
                    setData({
                      ...data,
                      payments: {
                        ...(data.payments || siteConfig.payments),
                        bankTransfer: { ...(data.payments || siteConfig.payments).bankTransfer, [k]: e.target.value },
                      },
                    })
                  }
                  className="rounded-lg border border-line px-3 py-2"
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-medium">Trang chủ</h2>
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1 text-sm">
            Dòng nhỏ trên banner
            <input
              value={(data.home || defaultHome).eyebrow}
              onChange={(e) => setData({ ...data, home: { ...(data.home || defaultHome), eyebrow: e.target.value } })}
              className="rounded-lg border border-line px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Ảnh banner (URL)
            <input
              value={(data.home || defaultHome).image}
              onChange={(e) => setData({ ...data, home: { ...(data.home || defaultHome), image: e.target.value } })}
              className="rounded-lg border border-line px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Mô tả ảnh
            <input
              value={(data.home || defaultHome).imageAlt}
              onChange={(e) => setData({ ...data, home: { ...(data.home || defaultHome), imageAlt: e.target.value } })}
              className="rounded-lg border border-line px-3 py-2"
            />
          </label>
          <p className="text-sm">Thứ tự khối</p>
          {(
            [
              ["categories", "Danh mục"],
              ["flash", "Flash sale"],
              ["featured", "Sản phẩm nổi bật"],
              ["journal", "Bài viết"],
            ] as const
          ).map(([id, label]) => {
            const blocks = (data.home || defaultHome).blocks;
            const on = blocks.includes(id);
            const move = (dir: number) => {
              const next = [...blocks];
              const i = next.indexOf(id);
              const j = i + dir;
              if (i < 0 || j < 0 || j >= next.length) return;
              [next[i], next[j]] = [next[j], next[i]];
              setData({ ...data, home: { ...(data.home || defaultHome), blocks: next } });
            };
            return (
              <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <span>{label}{on ? "" : " (đang ẩn)"}</span>
                <span className="flex gap-2">
                  <button type="button" className={btnGhost} onClick={() => move(-1)} disabled={!on}>Lên</button>
                  <button type="button" className={btnGhost} onClick={() => move(1)} disabled={!on}>Xuống</button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => {
                      const next = on ? blocks.filter((b) => b !== id) : [...blocks, id as HomeBlock];
                      setData({ ...data, home: { ...(data.home || defaultHome), blocks: next } });
                    }}
                  >
                    {on ? "Ẩn" : "Hiện"}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className={btnPrimary}
        >
          {saving ? "Đang lưu…" : "Lưu cài đặt"}
        </button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>
    </div>
  );
}
