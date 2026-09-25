import Link from "next/link";
import { defaultHome, isEnabled, siteConfig, type EffectiveBrand, type EffectiveHome, type EffectiveShipping } from "@/config/site";
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
  brand = siteConfig.brand,
  shipping = siteConfig.shipping,
  home = defaultHome,
}: {
  products: Product[];
  categories: Category[];
  articles: Article[];
  brand?: EffectiveBrand;
  shipping?: EffectiveShipping;
  home?: EffectiveHome;
}) {
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const flash = products.filter((p) => p.flashSale);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-primary md:text-7xl">
              {brand.tagline}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">{brand.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/san-pham"
                className="rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-white shadow-sm transition-shadow hover:shadow-md"
              >
                Xem sản phẩm
              </Link>
              <Link
                href="/lien-he"
                className="rounded-full border border-line bg-white px-7 py-3.5 text-sm transition-colors hover:border-primary hover:text-primary"
              >
                Tư vấn mua sắm
              </Link>
            </div>
          </div>
          <div className="hero-media relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lg md:aspect-[5/4]">
            <SmartImage
              src={home.image || defaultHome.image}
              alt={home.imageAlt || brand.name}
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
            { icon: IconTruck, title: "Giao toàn quốc", desc: `Freeship từ ${money(shipping.freeFrom)}` },
            { icon: IconRefresh, title: "Đổi trả 7 ngày", desc: "Giữ tem mác, chưa qua sử dụng" },
            { icon: IconShield, title: "Thanh toán linh hoạt", desc: "COD hoặc chuyển khoản" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <item.icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium leading-snug">{item.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col">
      {home.blocks.includes("categories") && (
      <section className="mx-auto max-w-6xl px-4 py-16" style={{ order: home.blocks.indexOf("categories") }}>
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-serif text-3xl leading-tight text-primary md:text-4xl">Danh mục</h2>
          <Link href="/san-pham" className="text-sm text-muted transition-colors hover:text-primary">
            Tất cả →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/san-pham?cat=${c.slug}`}
              className="rise-in group relative overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-md"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <SmartImage
                src={c.image}
                alt={c.name}
                className="aspect-[3/4] w-full"
                imgClassName="transition duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="font-serif text-xl leading-tight">{c.name}</p>
                <p className="mt-0.5 text-xs text-white/80">{c.productCount} sản phẩm</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {isEnabled("flashSale") && flash.length > 0 && home.blocks.includes("flash") && (
        <section className="bg-primary py-16 text-white" style={{ order: home.blocks.indexOf("flash") }}>
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Flash sale</h2>
              <Link href="/san-pham?flash=1" className="text-sm text-white/80 transition-colors hover:text-white">
                Xem thêm →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {flash.map((p) => (
                <Link
                  key={p.id}
                  href={`/san-pham/${p.slug}`}
                  className="group overflow-hidden rounded-2xl bg-white text-ink shadow-sm transition-shadow hover:shadow-md"
                >
                  <SmartImage
                    src={p.images[0]}
                    alt={p.name}
                    className="aspect-[4/3] w-full"
                    imgClassName="transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  <div className="p-3">
                    <p className="font-medium leading-snug">{p.name}</p>
                    <p className="mt-1 text-sm tabular">
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

      {home.blocks.includes("featured") && (
      <section className="mx-auto max-w-6xl px-4 py-16" style={{ order: home.blocks.indexOf("featured") }}>
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-serif text-3xl leading-tight text-primary md:text-4xl">Đáng nhìn tuần này</h2>
          <Link href="/san-pham" className="text-sm text-muted transition-colors hover:text-primary">
            Xem tất cả →
          </Link>
        </div>
        <ProductGrid products={featured} />
      </section>
      )}

      <div style={{ order: 50 }}>
        <RecentSection />
      </div>

      {isEnabled("blog") && home.blocks.includes("journal") && (
        <section className="border-t border-line bg-white py-16" style={{ order: home.blocks.indexOf("journal") }}>
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-serif text-3xl leading-tight text-primary md:text-4xl">Journal</h2>
              <Link href="/tin-tuc" className="text-sm text-muted transition-colors hover:text-primary">
                Tất cả bài →
              </Link>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {articles.map((a) => (
                <Link key={a.id} href={`/tin-tuc/${a.slug}`} className="group">
                  <div className="overflow-hidden rounded-2xl shadow-sm">
                    <SmartImage
                      src={a.cover}
                      alt={a.title}
                      className="aspect-[16/10] w-full"
                      imgClassName="transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {a.date} · {a.minutes} phút đọc
                  </p>
                  <h3 className="mt-1.5 font-serif text-xl leading-snug transition-colors group-hover:text-primary">
                    {a.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted line-clamp-2">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
