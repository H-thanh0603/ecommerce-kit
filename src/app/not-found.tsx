import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-2 font-serif text-4xl text-primary">Không tìm thấy trang</h1>
      <Link href="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm text-white">
        Về trang chủ
      </Link>
    </div>
  );
}
