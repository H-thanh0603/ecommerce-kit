import Link from "next/link";
import { listArticles } from "@/server/commerce";
import { isEnabled } from "@/config/site";
import { SmartImage } from "@/components/ui/SmartImage";

export const metadata = { title: "Journal" };

export default async function BlogPage() {
  if (!isEnabled("blog")) {
    return <p className="px-4 py-20 text-center">Module journal đang tắt.</p>;
  }
  const articles = await listArticles();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-serif text-4xl text-primary">Journal</h1>
      <p className="mt-2 text-muted">Ghi chép về chất liệu, không gian sống và cách dùng đồ.</p>
      <div className="mt-10 grid gap-8 md:grid-cols-3">
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
              {a.date} · {a.minutes} phút
            </p>
            <h2 className="mt-1 font-serif text-2xl leading-snug">{a.title}</h2>
            <p className="mt-2 text-sm text-muted">{a.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
