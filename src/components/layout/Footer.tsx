import Link from "next/link";
import { siteConfig, isEnabled, type EffectiveSite } from "@/config/site";
import type { Category } from "@/types";
import { NewsletterForm } from "@/components/layout/NewsletterForm";

export function Footer({ categories, brand }: { categories: Category[]; brand?: EffectiveSite["brand"] }) {
  const b = brand ?? siteConfig.brand;
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
            <NewsletterForm />
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-2xl text-primary">{b.name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            {b.tagline}. {b.description}
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
            <li>{b.address}</li>
            <li>{b.workingHours}</li>
            <li>{b.phone}</li>
            <li>{b.email}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-4 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} {b.name}. Khung TMĐT tái sử dụng.</p>
          <p>COD · Chuyển khoản{siteConfig.payments.momo.enabled ? " · MoMo" : ""}{siteConfig.payments.vnpay.enabled ? " · VNPay" : ""}</p>
        </div>
      </div>
    </footer>
  );
}
