/** Chạy trên production: URL gateway còn trỏ sandbox/dev → fail-fast (không âm thầm dùng nhầm). */
export function assertProdGateway(kind: string, url: string) {
  if (process.env.NODE_ENV !== "production") return;
  if (/sandbox|test-payment|dev-online|localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error(
      `${kind} đang trỏ URL sandbox/test (${url}) — set env production tương ứng trước khi chạy NODE_ENV=production.`,
    );
  }
}
