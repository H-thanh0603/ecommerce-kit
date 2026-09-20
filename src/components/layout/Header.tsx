"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { siteConfig, isEnabled } from "@/config/site";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useWishlist } from "@/lib/wishlist";
import { categories } from "@/data/catalog";
import {
  IconBag,
  IconClose,
  IconHeart,
  IconMenu,
  IconSearch,
  IconUser,
} from "@/components/icons";

export function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const { ids } = useWishlist();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/san-pham?q=${encodeURIComponent(query)}` : "/san-pham");
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-[11px] tracking-wide sm:text-xs">
          <p>Giao hàng toàn quốc · Đổi trả 7 ngày · {siteConfig.shipping.estimatedDays}</p>
          <p className="hidden sm:block">Hotline {siteConfig.brand.hotline}</p>
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
          {siteConfig.brand.logoText}
        </Link>

        <nav className="ml-6 hidden items-center gap-6 text-sm md:flex">
          <Link href="/san-pham" className="hover:text-primary">
            Sản phẩm
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/san-pham?cat=${c.slug}`} className="hover:text-primary">
              {c.name}
            </Link>
          ))}
          {isEnabled("blog") && (
            <Link href="/tin-tuc" className="hover:text-primary">
              Journal
            </Link>
          )}
          <Link href="/lien-he" className="hover:text-primary">
            Liên hệ
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {isEnabled("search") && (
            <form onSubmit={submitSearch} className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 lg:flex">
              <IconSearch className="h-4 w-4 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm sản phẩm…"
                className="w-44 bg-transparent text-sm outline-none"
              />
            </form>
          )}
          {isEnabled("wishlist") && (
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
          <form onSubmit={submitSearch} className="mb-3 flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2">
            <IconSearch className="h-4 w-4 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm sản phẩm…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </form>
          <div className="grid gap-2 text-sm">
            <Link href="/san-pham" onClick={() => setOpen(false)}>
              Tất cả sản phẩm
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/san-pham?cat=${c.slug}`} onClick={() => setOpen(false)}>
                {c.name}
              </Link>
            ))}
            {isEnabled("blog") && (
              <Link href="/tin-tuc" onClick={() => setOpen(false)}>
                Journal
              </Link>
            )}
            <Link href="/lien-he" onClick={() => setOpen(false)}>
              Liên hệ
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
