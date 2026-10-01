import Link from "next/link";
import { defaultHome, isEnabled, siteConfig, type EffectiveBrand, type EffectiveHome, type EffectiveShipping } from "@/config/site";
import { ProductGrid } from "@/components/product/ProductGrid";
import { RecentSection } from "@/components/home/RecentSection";
import { FlashCountdown } from "@/components/home/FlashCountdown";
import { SmartImage } from "@/components/ui/SmartImage";
import { IconChevron, IconRefresh, IconShield, IconStar, IconTruck } from "@/components/icons";
import { money } from "@/lib/format";
import type { Article, Category, Product, Review } from "@/types";

export type HomeReview = Review & { productName: string; productSlug: string };
export type HomeStats = { productCount: number; sold: number; ratingAvg: number; reviewCount: number };

export function HomeView({
  products,
  popular = [],
  categories,
  articles,
  reviews = [],
  bundleCount = 0,
  flashEnd,
  stats,
  brand = siteConfig.brand,
  shipping = siteConfig.shipping,
  home = defaultHome,
}: {
  products: Product[];
  popular?: Product[];
  categories: Category[];
  articles: Article[];
  reviews?: HomeReview[];
  bundleCount?: number;
  flashEnd?: string;
  stats?: HomeStats;
  brand?: EffectiveBrand;
  shipping?: EffectiveShipping;
  home?: EffectiveHome;
}) {
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const flash = products.filter((p) => p.flashSale);
  const marqueeItems = [
    `Freeship đơn từ ${money(shipping.freeFrom)}`,
    "Đổi trả trong 7 ngày",
    "COD & chuyển khoản",
    "Hàng chọn lọc, số lượng có hạn",
    `Hotline ${brand.hotline}`,
  ];
  const sealText =
    [...brand.tagline.split(".").map((s) => s.trim()).filter(Boolean), brand.name].join(" · ").toUpperCase() + " ·";

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* vòng trang trí nền — nhẹ, tôn tagline */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full border border-line"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full border border-line"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:py-20">
          <div>
            {home.eyebrow && (
              <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">
                <span aria-hidden className="h-px w-8 bg-accent" />
                {home.eyebrow}
              </p>
            )}
            <h1 className="font-serif text-5xl leading-[1.04] tracking-tight text-primary md:text-7xl">
              {brand.tagline.split(". ").length > 1 ? (
                <>
                  {brand.tagline.split(". ")[0]}.{" "}
                  <em className="text-accent">{brand.tagline.split(". ").slice(1).join(" ")}</em>
                </>
              ) : (
                brand.tagline
              )}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">{brand.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/san-pham"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(15,61,46,0.5)] transition-shadow hover:shadow-[0_14px_36px_-10px_rgba(15,61,46,0.6)]"
              >
                Xem sản phẩm
                <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/lien-he"
                className="rounded-full border border-line bg-white px-7 py-3.5 text-sm transition-colors hover:border-primary hover:text-primary"
              >
                Tư vấn mua sắm
              </Link>
            </div>
            {stats && (stats.sold > 0 || stats.reviewCount > 0) && (
              <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
                {stats.sold > 0 && (
                  <div>
                    <dd className="font-serif text-3xl tabular text-primary">
                      {stats.sold.toLocaleString("vi-VN")}+
                    </dd>
                    <dt className="mt-0.5 text-xs uppercase tracking-wider text-muted">Đã bán</dt>
                  </div>
                )}
                {stats.ratingAvg > 0 && (
                  <div>
                    <dd className="flex items-center gap-1.5 font-serif text-3xl tabular text-primary">
                      {stats.ratingAvg}
                      <IconStar className="h-5 w-5 text-accent" />
                    </dd>
                    <dt className="mt-0.5 text-xs uppercase tracking-wider text-muted">
                      {stats.reviewCount} đánh giá
                    </dt>
                  </div>
                )}
                {stats.productCount > 0 && (
                  <div>
                    <dd className="font-serif text-3xl tabular text-primary">{stats.productCount}+</dd>
                    <dt className="mt-0.5 text-xs uppercase tracking-wider text-muted">Sản phẩm</dt>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="relative">
            <div className="hero-media relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-20px_rgba(15,61,46,0.35)] md:aspect-[5/4]">
              <SmartImage
                src={home.image || defaultHome.image}
                alt={home.imageAlt || brand.name}
                className="h-full w-full"
                sizes="(max-width: 768px) 100vw, 50vw"
                eager
              />
              {/* badge freeship nổi */}
              <div className="float-y absolute bottom-4 left-4 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                  <IconTruck className="h-4 w-4 text-accent" />
                  Freeship từ {money(shipping.freeFrom)}
                </p>
              </div>
            </div>
            {/* con dấu tròn xoay — chữ quanh tròn */}
            <div className="absolute -left-6 -top-6 hidden h-28 w-28 md:block" aria-hidden>
              <svg viewBox="0 0 100 100" className="spin-slow h-full w-full text-primary">
                <defs>
                  <path id="seal-circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                </defs>
                <circle cx="50" cy="50" r="50" className="fill-canvas" />
                <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeOpacity="0.25" />
                <text fill="currentColor" fontSize="10.5" letterSpacing="2.5">
                  <textPath href="#seal-circ">{sealText}</textPath>
                </text>
                <path
                  d="M50 38l3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6L50 55.4 43.2 59l1.3-7.6-5.5-5.4 7.6-1.1L50 38z"
                  className="fill-accent"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee cam kết ──────────────────────────────── */}
      <section aria-label="Cam kết cửa hàng" className="overflow-hidden bg-accent py-3 text-white">
        <div className="marquee-track flex w-max items-center gap-10 whitespace-nowrap">
          {[0, 1].map((dup) => (
            <ul key={dup} className="flex items-center gap-10" aria-hidden={dup === 1}>
              {marqueeItems.map((t) => (
                <li key={t} className="flex items-center gap-10 text-sm font-medium tracking-wide">
                  {t}
                  <span aria-hidden className="text-white/50">✦</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* ── Perks ────────────────────────────────────────── */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3">
          {[
            { icon: IconTruck, title: "Giao toàn quốc", desc: `Freeship từ ${money(shipping.freeFrom)}` },
            { icon: IconRefresh, title: "Đổi trả 7 ngày", desc: "Giữ tem mác, chưa qua sử dụng" },
            { icon: IconShield, title: "Thanh toán linh hoạt", desc: "COD hoặc chuyển khoản" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas">
                <item.icon className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <div>
                <p className="font-medium leading-snug">{item.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col">
        {/* ── Danh mục ─────────────────────────────────── */}
        {home.blocks.includes("categories") && (
          <section className="mx-auto w-full max-w-6xl px-4 py-16" style={{ order: home.blocks.indexOf("categories") }}>
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-serif text-3xl leading-tight text-primary md:text-4xl">Danh mục</h2>
              <Link
                href="/san-pham"
                className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary"
              >
                Tất cả
                <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-opacity group-hover:from-black/80" />
                  <div className="absolute inset-x-3 bottom-3 flex items-end justify-between text-white">
                    <div>
                      <p className="font-serif text-xl leading-tight">{c.name}</p>
                      <p className="mt-0.5 text-xs text-white/80">{c.productCount} sản phẩm</p>
                    </div>
                    <IconChevron className="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Flash sale ───────────────────────────────── */}
        {isEnabled("flashSale") && flash.length > 0 && home.blocks.includes("flash") && (
          <section className="relative overflow-hidden bg-primary py-16 text-white" style={{ order: home.blocks.indexOf("flash") }}>
            <div aria-hidden className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-white/5" />
            <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-accent/20" />
            <div className="relative mx-auto max-w-6xl px-4">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-serif text-3xl leading-tight md:text-4xl">
                    Flash sale <em className="text-accent">sắp hết giờ</em>
                  </h2>
                  <p className="mt-2 text-sm text-white/70">Giá tốt trong thời gian có hạn — bán hết là dừng.</p>
                </div>
                <div className="flex items-center gap-3">
                  {flashEnd && <FlashCountdown endsAt={flashEnd} />}
                  <Link
                    href="/san-pham?flash=1"
                    className="group inline-flex items-center gap-1 text-sm text-white/80 transition-colors hover:text-white"
                  >
                    Xem thêm
                    <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {flash.map((p) => {
                  const off =
                    p.compareAtPrice && p.compareAtPrice > p.price
                      ? Math.round((1 - p.price / p.compareAtPrice) * 100)
                      : 0;
                  return (
                    <Link
                      key={p.id}
                      href={`/san-pham/${p.slug}`}
                      className="group overflow-hidden rounded-2xl bg-white text-ink shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="relative">
                        <SmartImage
                          src={p.images[0]}
                          alt={p.name}
                          className="aspect-[4/3] w-full"
                          imgClassName="transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        {off > 0 && (
                          <span className="absolute left-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
                            -{off}%
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium leading-snug">{p.name}</p>
                        <p className="mt-1 text-sm tabular">
                          {money(p.price)}
                          {p.compareAtPrice ? (
                            <span className="ml-2 text-muted line-through">{money(p.compareAtPrice)}</span>
                          ) : null}
                        </p>
                        {p.sold > 0 && (
                          <p className="mt-1.5 text-xs text-muted">
                            Đã bán <span className="font-medium text-accent tabular">{p.sold.toLocaleString("vi-VN")}</span>
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Featured ─────────────────────────────────── */}
        {home.blocks.includes("featured") && (
          <section className="mx-auto w-full max-w-6xl px-4 py-16" style={{ order: home.blocks.indexOf("featured") }}>
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-serif text-3xl leading-tight text-primary md:text-4xl">Đáng nhìn tuần này</h2>
              <Link
                href="/san-pham"
                className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary"
              >
                Xem tất cả
                <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ProductGrid products={featured} />
          </section>
        )}

        {/* ── Bán chạy ─────────────────────────────────── */}
        {home.blocks.includes("popular") && popular.length > 0 && (
          <section className="border-y border-line bg-white" style={{ order: home.blocks.indexOf("popular") }}>
            <div className="mx-auto max-w-6xl px-4 py-16">
              <div className="mb-10 flex items-end justify-between">
                <div>
                  <h2 className="font-serif text-3xl leading-tight text-primary md:text-4xl">Bán chạy nhất</h2>
                  <p className="mt-2 text-sm text-muted">Xếp theo số lượng đã bán thật trong cửa hàng.</p>
                </div>
                <Link
                  href="/san-pham?sort=popular"
                  className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary"
                >
                  Xem thêm
                  <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <ol className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                {popular.map((p, i) => (
                  <li key={p.id}>
                    <Link href={`/san-pham/${p.slug}`} className="group flex items-center gap-5">
                      <span
                        aria-hidden
                        className="w-10 shrink-0 font-serif text-4xl leading-none tabular text-line transition-colors group-hover:text-accent"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl shadow-sm">
                        <SmartImage src={p.images[0]} alt="" className="h-full w-full" sizes="80px" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-snug transition-colors group-hover:text-primary">
                          {p.name}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                          <IconStar className="h-3 w-3 text-accent" />
                          {p.rating} · Đã bán {p.sold.toLocaleString("vi-VN")}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular">{money(p.price)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* ── Đánh giá khách ────────────────────────────── */}
        {isEnabled("reviews") && home.blocks.includes("reviews") && reviews.length > 0 && (
          <section className="mx-auto w-full max-w-6xl px-4 py-16" style={{ order: home.blocks.indexOf("reviews") }}>
            <div className="mb-10 max-w-lg">
              <h2 className="font-serif text-3xl leading-tight text-primary md:text-4xl">
                Khách nói gì sau khi mua
              </h2>
              <p className="mt-2 text-sm text-muted">Đánh giá thật từ đơn đã giao — đã qua kiểm duyệt.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <figure
                  key={r.id}
                  className="flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-sm"
                >
                  <div>
                    <div className="flex gap-0.5 text-accent" aria-label={`${r.rating} trên 5 sao`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <IconStar key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "" : "opacity-20"}`} />
                      ))}
                    </div>
                    <blockquote className="mt-3 text-sm leading-relaxed text-ink">
                      “{r.content}”
                    </blockquote>
                  </div>
                  <figcaption className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                    <span className="font-medium">{r.author}</span>
                    <Link
                      href={`/san-pham/${r.productSlug}`}
                      className="max-w-[55%] truncate text-muted transition-colors hover:text-primary"
                    >
                      {r.productName}
                    </Link>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ── Combo CTA ────────────────────────────────── */}
        {isEnabled("bundles") && home.blocks.includes("combo") && bundleCount > 0 && (
          <section className="mx-auto w-full max-w-6xl px-4 pb-4" style={{ order: home.blocks.indexOf("combo") }}>
            <Link
              href="/combo"
              className="group relative block overflow-hidden rounded-[2rem] bg-accent px-6 py-10 text-white shadow-[0_20px_50px_-20px_rgba(196,92,38,0.55)] md:px-12"
            >
              <div aria-hidden className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[14px] border-white/10" />
              <div aria-hidden className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full border-[18px] border-white/10" />
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="font-serif text-3xl leading-tight md:text-4xl">
                    Combo đi cùng nhau — rẻ hơn mua lẻ
                  </p>
                  <p className="mt-2 text-sm text-white/85">
                    {bundleCount} combo đang mở bán, giá gói đã trừ sẵn phần chênh.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-accent transition-transform group-hover:scale-[1.03]">
                  Xem combo
                  <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </section>
        )}

        <div style={{ order: 50 }}>
          <RecentSection />
        </div>

        {/* ── Journal ──────────────────────────────────── */}
        {isEnabled("blog") && home.blocks.includes("journal") && articles.length > 0 && (
          <section className="border-t border-line bg-white py-16" style={{ order: home.blocks.indexOf("journal") }}>
            <div className="mx-auto max-w-6xl px-4">
              <div className="mb-8 flex items-end justify-between">
                <h2 className="font-serif text-3xl leading-tight text-primary md:text-4xl">Journal</h2>
                <Link
                  href="/tin-tuc"
                  className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary"
                >
                  Tất cả bài
                  <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
