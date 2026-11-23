"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { m } from "motion/react";
import { Sparkles } from "lucide-react";
import {
  defaultHome,
  type EffectiveBrand,
  type EffectiveHome,
  type EffectiveShipping,
  type HeroPreset,
} from "@/config/site";
import { SmartImage } from "@/components/ui/SmartImage";
import { NumberTicker } from "@/components/ui/NumberTicker";
import { IconChevron, IconStar, IconTruck } from "@/components/icons";
import { money } from "@/lib/format";
import type { Category } from "@/types";
import type { HomeStats } from "@/components/home/HomeView";

// Chỉ tải WebGL OGL (~8KB) khi tenant bật preset "webgl" — giữ budget 0KB cho preset mặc định.
const AmbientShaderCanvas = dynamic(
  () => import("@/components/home/AmbientShaderCanvas").then((mod) => ({ default: mod.AmbientShaderCanvas })),
  { ssr: false },
);

function TaglineHeading({
  tagline,
  className,
  accentClass = "text-accent",
}: {
  tagline: string;
  className: string;
  accentClass?: string;
}) {
  const parts = tagline.split(". ");
  return (
    <h1 className={className}>
      {parts.length > 1 ? (
        <>
          {parts[0]}. <em className={accentClass}>{parts.slice(1).join(" ")}</em>
        </>
      ) : (
        tagline
      )}
    </h1>
  );
}

function HeroStatsRow({
  stats,
  dark = false,
}: {
  stats?: HomeStats;
  dark?: boolean;
}) {
  if (!stats || (stats.sold <= 0 && stats.reviewCount <= 0)) return null;
  const numCls = dark ? "text-white" : "text-primary";
  const lblCls = dark ? "text-white/70" : "text-muted";
  const borderCls = dark ? "border-white/20" : "border-line";

  return (
    <dl className={`mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t ${borderCls} pt-6`}>
      {stats.sold > 0 && (
        <div>
          <dd className={`font-serif text-3xl tabular ${numCls}`}>
            <NumberTicker value={stats.sold} suffix="+" />
          </dd>
          <dt className={`mt-0.5 text-xs uppercase tracking-wider ${lblCls}`}>Đã bán</dt>
        </div>
      )}
      {stats.ratingAvg > 0 && (
        <div>
          <dd className={`flex items-center gap-1.5 font-serif text-3xl tabular ${numCls}`}>
            <NumberTicker value={stats.ratingAvg} decimals={1} />
            <IconStar className="h-5 w-5 text-accent" />
          </dd>
          <dt className={`mt-0.5 text-xs uppercase tracking-wider ${lblCls}`}>
            {stats.reviewCount} đánh giá
          </dt>
        </div>
      )}
      {stats.productCount > 0 && (
        <div>
          <dd className={`font-serif text-3xl tabular ${numCls}`}>
            <NumberTicker value={stats.productCount} suffix="+" />
          </dd>
          <dt className={`mt-0.5 text-xs uppercase tracking-wider ${lblCls}`}>Sản phẩm</dt>
        </div>
      )}
    </dl>
  );
}

const PRESETS: { id: HeroPreset; label: string }[] = [
  { id: "openhero", label: "OpenHero" },
  { id: "webgl", label: "WebGL 3D" },
  { id: "bento", label: "Bento" },
  { id: "editorial", label: "Editorial" },
];

function DevPresetBar({
  active,
  onChange,
}: {
  active: HeroPreset;
  onChange: (p: HeroPreset) => void;
}) {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-1 rounded-full border border-line bg-white/95 p-1 text-xs shadow-lg backdrop-blur-md">
      <span className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted">Hero</span>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`rounded-full px-2.5 py-1 transition ${
            active === p.id ? "bg-primary font-medium text-white" : "text-muted hover:text-ink"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function HomeHero({
  brand,
  shipping,
  home,
  stats,
  categories,
}: {
  brand: EffectiveBrand;
  shipping: EffectiveShipping;
  home: EffectiveHome;
  stats?: HomeStats;
  categories: Category[];
}) {
  const [devPreset, setDevPreset] = useState<HeroPreset | null>(null);
  const preset = devPreset ?? home.heroPreset ?? "openhero";
  const heroImg = home.image || defaultHome.image;
  const heroAlt = home.imageAlt || brand.name;
  const sealText =
    [...brand.tagline.split(".").map((s) => s.trim()).filter(Boolean), brand.name]
      .join(" · ")
      .toUpperCase() + " ·";

  const content = (() => {
    // ── Preset 2: OpenHero (mesh aura + glass card + editorial split) ──
    if (preset === "openhero") {
    return (
      <section className="relative overflow-hidden border-b border-line bg-canvas">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 55% at 15% 15%, color-mix(in srgb, var(--brand-primary) 16%, transparent), transparent 70%), radial-gradient(50% 50% at 85% 25%, color-mix(in srgb, var(--brand-accent) 18%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-12 md:py-24">
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-7"
          >
            {home.eyebrow && (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-primary shadow-xs backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {home.eyebrow}
              </span>
            )}
            <TaglineHeading
              tagline={brand.tagline}
              className="mt-5 font-serif text-5xl leading-[1.03] tracking-tight text-primary md:text-7xl"
            />
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">{brand.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/san-pham"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-white shadow-[0_14px_34px_-10px_rgba(15,61,46,0.55)] transition hover:-translate-y-0.5"
              >
                Khám phá bộ sưu tập
                <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/lien-he"
                className="rounded-full border border-line bg-white/80 px-7 py-3.5 text-sm backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
              >
                Tư vấn mua sắm
              </Link>
            </div>
            <HeroStatsRow stats={stats} />
          </m.div>

          <m.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative md:col-span-5"
          >
            <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 p-2 shadow-2xl backdrop-blur-md">
              <div className="overflow-hidden rounded-[1.5rem]">
                <SmartImage
                  src={heroImg}
                  alt={heroAlt}
                  className="aspect-[4/5] w-full"
                  sizes="(max-width: 768px) 100vw, 42vw"
                  eager
                />
              </div>
              <div className="flex items-center justify-between px-3 py-3 text-xs">
                <span className="flex items-center gap-2 font-medium text-primary">
                  <IconTruck className="h-4 w-4 text-accent" />
                  Freeship từ {money(shipping.freeFrom)}
                </span>
                <span className="text-muted">{shipping.estimatedDays}</span>
              </div>
            </div>
          </m.div>
        </div>
      </section>
    );
  }

  // ── Preset 3: Bento Grid Showcase ──
  if (preset === "bento") {
    const topCats = categories.slice(0, 2);
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-4 md:grid-cols-12 md:grid-rows-[minmax(280px,auto)_auto]">
          <div className="flex flex-col justify-between rounded-[2rem] border border-line bg-white p-7 md:col-span-7 md:p-10">
            <div>
              {home.eyebrow && (
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
                  {home.eyebrow}
                </p>
              )}
              <TaglineHeading
                tagline={brand.tagline}
                className="mt-3 font-serif text-4xl leading-[1.06] text-primary md:text-6xl"
              />
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{brand.description}</p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/san-pham"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white"
              >
                Xem sản phẩm
                <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/combo"
                className="rounded-full border border-line bg-canvas px-6 py-3 text-sm hover:border-primary hover:text-primary"
              >
                Combo tiết kiệm
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] md:col-span-5 md:row-span-2">
            <SmartImage
              src={heroImg}
              alt={heroAlt}
              className="h-full min-h-[320px] w-full"
              sizes="(max-width: 768px) 100vw, 42vw"
              eager
            />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <IconTruck className="h-4 w-4 text-accent" />
                Freeship đơn từ {money(shipping.freeFrom)} · {shipping.estimatedDays}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 md:col-span-7">
            <div className="flex flex-col justify-between rounded-3xl bg-primary p-5 text-white">
              <p className="text-xs uppercase tracking-wider text-white/70">Đánh giá</p>
              <div>
                <p className="flex items-center gap-1.5 font-serif text-3xl tabular">
                  <NumberTicker value={stats?.ratingAvg || 4.9} decimals={1} />
                  <IconStar className="h-5 w-5 text-accent" />
                </p>
                <p className="mt-1 text-xs text-white/75">
                  {stats?.sold ? `${stats.sold.toLocaleString("vi-VN")}+ sản phẩm đã bán` : "Khách hàng tin chọn"}
                </p>
              </div>
            </div>
            {topCats.map((c) => (
              <Link
                key={c.id}
                href={`/san-pham?cat=${c.slug}`}
                className="group relative overflow-hidden rounded-3xl border border-line bg-white"
              >
                <SmartImage
                  src={c.image}
                  alt={c.name}
                  className="aspect-[4/3] h-full w-full"
                  imgClassName="transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute inset-x-3 bottom-3 text-white">
                  <p className="font-serif text-lg leading-tight">{c.name}</p>
                  <p className="text-[11px] text-white/80">{c.productCount} sản phẩm</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Preset 4: WebGL Ambient Shader (OGL ~8KB, lazy-loaded) ──
  if (preset === "webgl") {
    return (
      <section className="relative overflow-hidden bg-primary text-white">
        <AmbientShaderCanvas />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div>
            {home.eyebrow && (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                {home.eyebrow}
              </p>
            )}
            <TaglineHeading
              tagline={brand.tagline}
              className="font-serif text-5xl leading-[1.04] tracking-tight text-white md:text-7xl"
              accentClass="text-amber-200"
            />
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/80">{brand.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/san-pham"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-primary shadow-xl transition hover:bg-canvas"
              >
                Xem sản phẩm
                <IconChevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/lien-he"
                className="rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Tư vấn mua sắm
              </Link>
            </div>
            <HeroStatsRow stats={stats} dark />
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur-md">
              <SmartImage
                src={heroImg}
                alt={heroAlt}
                className="aspect-[4/5] w-full rounded-[1.5rem] md:aspect-[5/4]"
                sizes="(max-width: 768px) 100vw, 45vw"
                eager
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Preset 1 (mặc định): Editorial ──
  return (
    <section className="relative overflow-hidden">
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
          <TaglineHeading
            tagline={brand.tagline}
            className="font-serif text-5xl leading-[1.04] tracking-tight text-primary md:text-7xl"
          />
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
          <HeroStatsRow stats={stats} />
        </div>

        <div className="relative">
          <div className="hero-media relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-20px_rgba(15,61,46,0.35)] md:aspect-[5/4]">
            <SmartImage
              src={heroImg}
              alt={heroAlt}
              className="h-full w-full"
              sizes="(max-width: 768px) 100vw, 50vw"
              eager
            />
            <div className="float-y absolute bottom-4 left-4 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <IconTruck className="h-4 w-4 text-accent" />
                Freeship từ {money(shipping.freeFrom)}
              </p>
            </div>
          </div>
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
    );
  })();

  return (
    <>
      {content}
      <DevPresetBar active={preset} onChange={setDevPreset} />
    </>
  );
}
