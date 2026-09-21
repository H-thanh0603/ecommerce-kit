import type { Product } from "@/types";

const APP = () => process.env.APP_URL || "http://localhost:3000";

export function OrganizationJsonLd({ name, description }: { name: string; description: string }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    description,
    url: APP(),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export function ProductJsonLd({ product, category }: { product: Product; category: string }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.slice(0, 4),
    category,
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${APP()}/san-pham/${product.slug}`,
    },
    ...(product.rating > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } }
      : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export function BreadcrumbJsonLd({ trail }: { trail: Array<{ name: string; href: string }> }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${APP()}${t.href}`,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
