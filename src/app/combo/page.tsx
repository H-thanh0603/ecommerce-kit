import { enterTenant, resolveRequestTenant } from "@/server/request-tenant";
import Link from "next/link";
import { listBundles } from "@/server/bundle";
import { getProductById } from "@/server/catalog";
import { money } from "@/lib/format";
import { isFeatureOn } from "@/server/settings";
import { AddBundleButton } from "@/components/bundle/AddBundleButton";

export default async function ComboPage() {
  enterTenant(await resolveRequestTenant());
  if (!(await isFeatureOn("bundles"))) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-muted">Chưa bật module combo.</p>
        <Link href="/san-pham" className="text-sm underline">
          Xem sản phẩm
        </Link>
      </div>
    );
  }
  const bundles = await listBundles(true);
  const detailed = await Promise.all(
    bundles.map(async (b) => ({
      ...b,
      products: (
        await Promise.all(
          b.lines.map(async (l) => ({
            line: l,
            product: await getProductById(l.productId),
          })),
        )
      ).filter((x) => x.product),
      sum: 0,
    })),
  );
  for (const d of detailed) {
    d.sum = d.products.reduce((s, x) => s + x.product!.price * x.line.quantity, 0);
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl text-primary">Combo tiết kiệm</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {detailed.map((b) => (
          <article key={b.id} className="rounded-3xl border border-line bg-white p-6">
            <h2 className="font-serif text-2xl">{b.name}</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {b.products.map((x) => (
                <li key={x.line.productId + (x.line.skuId || "")}>
                  {x.product!.name} × {x.line.quantity} — {money(x.product!.price * x.line.quantity)}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted line-through">Giá lẻ {money(b.sum)}</p>
            <p className="text-2xl font-medium text-primary">Giá combo {money(b.price)}</p>
            <AddBundleButton bundleId={b.id} lines={b.lines} />
          </article>
        ))}
        {detailed.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center md:col-span-2">
            <p className="font-serif text-xl text-primary">Chưa có combo nào đang mở bán</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Combo thường mở theo đợt — quay lại sau hoặc xem sản phẩm lẻ vẫn đang có sẵn nhé.
            </p>
            <Link href="/san-pham" className="mt-5 inline-block rounded-full bg-primary px-5 py-2 text-sm text-white">
              Xem tất cả sản phẩm
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
