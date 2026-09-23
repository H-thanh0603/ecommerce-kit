export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-16" aria-busy="true" aria-label="Đang tải">
      <div className="h-8 w-2/3 rounded bg-line" />
      <div className="mt-4 h-4 w-1/3 rounded bg-line" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-line" />
        ))}
      </div>
    </div>
  );
}
