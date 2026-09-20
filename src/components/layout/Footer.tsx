import Link from "next/link";
import { siteConfig, isEnabled } from "@/config/site";
import type { Category } from "@/types";

export function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      {isEnabled("newsletter") && (
        <div className="border-b border-line bg-primary text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 md:flex-row md:items-center">
            <div>
              <p className="font-serif text-2xl">Nhận thư từ cửa hàng</p>
              <p className="mt-1 text-sm text-white/75">
                Ưu đãi và bài viết mới — không spam, huỷ bất cứ lúc nào.
              </p>
            </div>
            <form className="flex w-full max-w-md gap-2">
              <input
                type="email"
                required
                placeholder="Email của bạn"
                className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm text-ink outline-none"
              />
              <button className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">
                Đăng ký
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-2xl text-primary">{siteConfig.brand.name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            {siteConfig.brand.tagline}. {siteConfig.brand.description}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Danh mục</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/san-pham?cat=${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Hỗ trợ</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/chinh-sach">Đổi trả & bảo hành</Link>
            </li>
            <li>
              <Link href="/chinh-sach">Vận chuyển</Link>
            </li>
            <li>
              <Link href="/lien-he">Liên hệ</Link>
            </li>
            {isEnabled("blog") && (
              <li>
                <Link href="/tin-tuc">Journal</Link>
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Cửa hàng</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>{siteConfig.brand.address}</li>
            <li>{siteConfig.brand.workingHours}</li>
            <li>{siteConfig.brand.phone}</li>
            <li>{siteConfig.brand.email}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-4 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} {siteConfig.brand.name}. Khung TMĐT tái sử dụng.</p>
          <p>COD · Chuyển khoản{siteConfig.payments.momo.enabled ? " · MoMo" : ""}{siteConfig.payments.vnpay.enabled ? " · VNPay" : ""}</p>
        </div>
      </div>
    </footer>
  );
}
