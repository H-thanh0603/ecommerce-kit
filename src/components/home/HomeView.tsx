import Link from "next/link";
import { siteConfig, isEnabled } from "@/config/site";
import { ProductGrid } from "@/components/product/ProductGrid";
import { RecentSection } from "@/components/home/RecentSection";
import { SmartImage } from "@/components/ui/SmartImage";
import { IconRefresh, IconShield, IconTruck } from "@/components/icons";
import { money } from "@/lib/format";
import type { Article, Category, Product } from "@/types";

export function HomeView({
  products,
  categories,
  articles,
}: {
  products: Product[];
  categories: Category[];
  articles: Article[];
}) {
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const flash = products.filter((p) => p.flashSale);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-accent">Cửa hàng chọn lọc</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-primary md:text-6xl">
              {siteConfig.brand.tagline}
            </h1>
            <p className="mt-4 max-w-md text-muted">{siteConfig.brand.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/san-pham" className="rounded-full bg-primary px-6 py-3 text-sm text-white">
                Xem sản phẩm
              </Link>
              <Link href="/lien-he" className="rounded-full border border-line px-6 py-3 text-sm">
                Tư vấn mua sắm
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] md:aspect-[5/4]">
            <SmartImage
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80"
              alt="Atelier"
              className="h-full w-full"
              sizes="(max-width: 768px) 100vw, 50vw"
              eager
            />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3">
          {[
            { icon: IconTruck, title: "Giao toàn quốc", desc: `Freeship từ ${money(siteConfig.shipping.freeFrom)}` },
            { icon: IconRefresh, title: "Đổi trả 7 ngày", desc: "Giữ tem mác, chưa qua sử dụng" },
            { icon: IconShield, title: "Thanh toán linh hoạt", desc: "COD hoặc chuyển khoản" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <item.icon className="mt-0.5 h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-3xl text-primary">Danh mục</h2>
          <Link href="/san-pham" className="text-sm text-muted hover:text-primary">
            Tất cả →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/san-pham?cat=${c.slug}`} className="group relative overflow-hidden rounded-2xl">
              <SmartImage
                src={c.image}
                alt={c.name}
                className="aspect-[3/4] w-full"
                imgClassName="transition group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="font-serif text-xl">{c.name}</p>
                <p className="text-xs text-white/80">{c.productCount} sản phẩm</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {isEnabled("flashSale") && flash.length > 0 && (
        <section className="bg-primary py-14 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Ưu đãi có hạn</p>
                <h2 className="font-serif text-3xl">Flash sale</h2>
              </div>
              <Link href="/san-pham" className="text-sm text-white/80">
                Xem thêm →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {flash.map((p) => (
                <Link key={p.id} href={`/san-pham/${p.slug}`} className="overflow-hidden rounded-2xl bg-white text-ink">
                  <SmartImage src={p.images[0]} alt={p.name} className="aspect-[4/3] w-full" sizes="(max-width: 768px) 50vw, 33vw" />
                  <div className="p-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-1 text-sm">
                      {money(p.price)}
                      {p.compareAtPrice ? (
                        <span className="ml-2 text-muted line-through">{money(p.compareAtPrice)}</span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-3xl text-primary">Đáng nhìn tuần này</h2>
          <Link href="/san-pham" className="text-sm text-muted">
            Xem tất cả →
          </Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      <RecentSection />

      {isEnabled("blog") && (
        <section className="border-t border-line bg-white py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-serif text-3xl text-primary">Journal</h2>
              <Link href="/tin-tuc" className="text-sm text-muted">
                Tất cả bài →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {articles.map((a) => (
                <Link key={a.id} href={`/tin-tuc/${a.slug}`} className="group">
                  <div className="overflow-hidden rounded-2xl">
                    <SmartImage
                      src={a.cover}
                      alt={a.title}
                      className="aspect-[16/10] w-full"
                      imgClassName="transition group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {a.date} · {a.minutes} phút đọc
                  </p>
                  <h3 className="mt-1 font-serif text-xl leading-snug">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
