import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  return { title: article?.title ?? "Bài viết" };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/tin-tuc" className="text-sm text-muted">
        ← Journal
      </Link>
      <p className="mt-6 text-xs text-muted">
        {article.date} · {article.minutes} phút đọc
      </p>
      <h1 className="mt-2 font-serif text-4xl text-primary">{article.title}</h1>
      <div className="mt-6 overflow-hidden rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={article.cover} alt="" className="w-full object-cover" />
      </div>
      <div className="mt-8 space-y-4 leading-relaxed text-muted">
        <p>{article.excerpt}</p>
        <p>
          Đây là nội dung mẫu trong khung. Khi làm cho khách, thay bằng CMS (Sanity, Payload, hoặc Markdown)
          và giữ nguyên layout bài viết.
        </p>
      </div>
    </article>
  );
}
