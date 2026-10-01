"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { siteConfig, type EffectiveSite } from "@/config/site";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useWishlist } from "@/lib/wishlist";
import { useFeatures } from "@/lib/features";
import { money } from "@/lib/format";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Category } from "@/types";
import {
  IconBag,
  IconClose,
  IconHeart,
  IconMenu,
  IconSearch,
  IconUser,
} from "@/components/icons";

type SugItem = { name: string; slug: string; image: string; price: number };

export function Header({
  categories,
  brand,
  shippingEta,
}: {
  categories: Category[];
  brand?: EffectiveSite["brand"];
  shippingEta?: string;
}) {
  const { count } = useCart();
  const { user } = useAuth();
  const { ids } = useWishlist();
  const features = useFeatures();
  const [open, setOpen] = useState(false);
  const b = brand ?? siteConfig.brand;
  const eta = shippingEta ?? siteConfig.shipping.estimatedDays;
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<SugItem[]>([]);
  const [showSugs, setShowSugs] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const router = useRouter();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/san-pham?q=${encodeURIComponent(query)}` : "/san-pham");
    setShowSugs(false);
    setOpen(false);
  };

  // Gợi ý tìm kiếm — debounce 250ms, gọi /api/search/suggest.
  // Hi/ẩn dropdown derive lúc render (q đủ dài + có kết quả) thay vì reset setState trong effect.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          setSugs(data.items || []);
          setShowSugs(true);
        }
      } catch {
        /* aborted hoặc lỗi mạng — giữ nguyên trạng thái cũ */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  const sugsVisible = showSugs && q.trim().length >= 2 && sugs.length > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-[11px] tracking-wide sm:text-xs">
          <p>Giao hàng toàn quốc · Đổi trả 7 ngày · {eta}</p>
          <p className="hidden sm:block">Hotline {b.hotline}</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <button
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
        </button>

        <Link href="/" className="font-serif text-2xl tracking-tight text-primary">
          {b.logoText}
        </Link>

        <nav className="ml-6 hidden items-center gap-6 text-sm md:flex">
          {siteConfig.nav.map((item) =>
            "feature" in item && item.feature && !features.on(item.feature) ? null : (
              <Link key={item.href} href={item.href} className="hover:text-primary">
                {item.label}
              </Link>
            ),
          )}
          <div className="relative">
            <button
              onClick={() => setCatOpen((v) => !v)}
              aria-expanded={catOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1 hover:text-primary"
            >
              Danh mục
              <span aria-hidden className={`transition-transform ${catOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {catOpen && (
              <div role="menu" className="absolute left-0 top-full z-50 mt-3 w-56 rounded-2xl border border-line bg-white p-2 shadow-xl">
                <Link
                  href="/san-pham"
                  role="menuitem"
                  onClick={() => setCatOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas"
                >
                  Tất cả sản phẩm
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/san-pham?cat=${c.slug}`}
                    role="menuitem"
                    onClick={() => setCatOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-canvas"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {features.on("search") && (
            <div className="relative hidden lg:block">
              <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5" role="search">
                <IconSearch className="h-4 w-4 text-muted" />
                <label htmlFor="d-search" className="sr-only">Tìm sản phẩm</label>
                <input
                  id="d-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setShowSugs(false)}
                  placeholder="Tìm sản phẩm…"
                  autoComplete="off"
                  className="w-44 bg-transparent text-sm outline-none"
                />
              </form>
              {sugsVisible && (
                <div role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
                  {sugs.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/san-pham/${s.slug}`}
                      role="option"
                      onClick={() => setShowSugs(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-canvas"
                    >
                      <SmartImage src={s.image} alt="" className="h-11 w-11 shrink-0 rounded-lg" sizes="44px" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{s.name}</span>
                        <span className="text-xs text-muted">{money(s.price)}</span>
                      </span>
                    </Link>
                  ))}
                  <Link
                    href={`/san-pham?q=${encodeURIComponent(q.trim())}`}
                    onClick={() => setShowSugs(false)}
                    className="block border-t border-line px-3 py-2 text-center text-xs text-primary underline"
                  >
                    Xem tất cả kết quả “{q.trim()}”
                  </Link>
                </div>
              )}
            </div>
          )}
          {features.on("compare") && (
            <Link href="/so-sanh" className="hidden text-xs underline sm:inline">
              So sánh
            </Link>
          )}
          {features.on("wishlist") && (
            <Link href="/yeu-thich" className="relative" aria-label="Yêu thích">
              <IconHeart className="h-5 w-5" />
              {ids.length > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] text-white">
                  {ids.length}
                </span>
              )}
            </Link>
          )}
          <Link href={user ? "/tai-khoan" : "/dang-nhap"} aria-label="Tài khoản">
            <IconUser className="h-5 w-5" />
          </Link>
          <Link href="/gio-hang" className="relative" aria-label="Giỏ hàng">
            <IconBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-canvas px-4 py-4 md:hidden">
          {features.on("search") && (
            <form onSubmit={submitSearch} className="mb-3 flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2" role="search">
              <IconSearch className="h-4 w-4 text-muted" />
              <label htmlFor="m-search" className="sr-only">Tìm sản phẩm</label>
              <input
                id="m-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm sản phẩm…"
                autoComplete="off"
                className="w-full bg-transparent text-sm outline-none"
              />
            </form>
          )}
          <div className="grid gap-2 text-sm">
            {siteConfig.nav.map((item) =>
              "feature" in item && item.feature && !features.on(item.feature) ? null : (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ),
            )}
            {categories.map((c) => (
              <Link key={c.id} href={`/san-pham?cat=${c.slug}`} onClick={() => setOpen(false)}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
