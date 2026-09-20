import { isEnabled } from "@/config/site";
import { reviews } from "@/data/catalog";
import { IconStar } from "@/components/icons";

export function Reviews({ productId }: { productId: string }) {
  if (!isEnabled("reviews")) return null;
  const list = reviews.filter((r) => r.productId === productId);

  return (
    <section className="mt-12 border-t border-line pt-10">
      <h2 className="font-serif text-2xl text-primary">Đánh giá</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Chưa có đánh giá cho sản phẩm này.</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {list.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{r.author}</p>
                <p className="flex items-center gap-1 text-sm text-accent">
                  <IconStar className="h-4 w-4" />
                  {r.rating}
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.content}</p>
              <p className="mt-2 text-xs text-muted">{r.createdAt}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
