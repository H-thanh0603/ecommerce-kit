import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, relatedProducts } from "@/server/commerce";
import { money } from "@/lib/format";
import { isEnabled, siteConfig } from "@/config/site";
import { AddToCart } from "@/components/product/AddToCart";
import { Reviews } from "@/components/product/Reviews";
import { ProductGrid } from "@/components/product/ProductGrid";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/JsonLd";
import { RecentTracker } from "@/lib/recent";
import { IconStar } from "@/components/icons";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  return { title: data?.product.name ?? "Sản phẩm" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();
  const { product, reviews: productReviews } = data;
  const related = await relatedProducts(product);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ProductJsonLd product={product} category={product.category} />
      <RecentTracker product={product} />      <BreadcrumbJsonLd
        trail={[
          { name: "Trang chủ", href: "/" },
          { name: "Sản phẩm", href: "/san-pham" },
          { name: product.name, href: `/san-pham/${product.slug}` },
        ]}
      />
      <p className="text-sm text-muted">
        <Link href="/">Trang chủ</Link> / <Link href="/san-pham">Sản phẩm</Link> / {product.name}
      </p>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="space-y-3">
          {product.images.map((src) => (
            <div key={src} className="overflow-hidden rounded-3xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={product.name} className="aspect-[4/5] w-full object-cover" />
            </div>
          ))}
        </div>
        <div className="md:sticky md:top-28 md:self-start">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">{product.category}</p>
          <h1 className="mt-2 font-serif text-4xl text-primary">{product.name}</h1>
          {product.subtitle && <p className="mt-2 text-muted">{product.subtitle}</p>}
          {isEnabled("reviews") && (
            <p className="mt-3 flex items-center gap-1 text-sm">
              <IconStar className="h-4 w-4 text-accent" />
              {product.rating} · {product.reviewCount || productReviews.length} đánh giá
            </p>
          )}
          <div className="mt-4 flex items-end gap-3">
            <p className="text-3xl font-medium">{money(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="pb-1 text-muted line-through">{money(product.compareAtPrice)}</p>
            ) : null}
          </div>
          {isEnabled("stockBadge") && (
            <p className="mt-2 text-sm text-muted">
              Còn {product.stock} sản phẩm · Đã bán {product.sold}
            </p>
          )}
          <p className="mt-6 leading-relaxed text-muted">{product.description}</p>
          <div className="mt-8">
            <AddToCart product={product} />
          </div>
          <ul className="mt-8 space-y-1 text-sm text-muted">
            <li>Giao {siteConfig.shipping.estimatedDays}</li>
            <li>Freeship từ {money(siteConfig.shipping.freeFrom)}</li>
            <li>Đổi trả trong 7 ngày</li>
          </ul>
        </div>
      </div>

      <Reviews reviews={productReviews} productId={product.id} />

      {isEnabled("relatedProducts") && related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 font-serif text-2xl text-primary">Có thể bạn cũng thích</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
