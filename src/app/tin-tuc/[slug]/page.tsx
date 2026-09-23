import Link from "next/link";
import { notFound } from "next/navigation";
import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import { getArticle } from "@/server/commerce";
import { SmartImage } from "@/components/ui/SmartImage";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  enterTenant(await resolveRequestTenant());
  const { slug } = await params;
  const article = await getArticle(slug);
  return { title: article?.title ?? "Bài viết" };
}

export default async function ArticlePage({ params }: Props) {
  enterTenant(await resolveRequestTenant());
  const { slug } = await params;
  const article = await getArticle(slug);
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
        <SmartImage src={article.cover} alt={article.title} className="aspect-[16/9] w-full" eager />
      </div>
      <div className="mt-8 space-y-4 leading-relaxed text-muted">
        <p>{article.body || article.excerpt}</p>
      </div>
    </article>
  );
}
