import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/server/session";
import { PLATFORM_COOKIE, readPlatformSession } from "@/server/platform-auth";

function securityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  // Nới lỏng cho Next.js dev (inline/eval) — production vẫn chạy được.
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  return res;
}

export async function proxy(req: NextRequest) {
  // CSRF defense-in-depth: API mutate từ Origin khác → chặn (IPN/webhook server-to-server không có Origin → bỏ qua).
  if (
    (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE") &&
    req.nextUrl.pathname.startsWith("/api/")
  ) {
    const origin = req.headers.get("origin");
    if (origin) {
      const allowed = new Set<string>([req.nextUrl.origin]);
      if (process.env.APP_URL) {
        try {
          allowed.add(new URL(process.env.APP_URL).origin);
        } catch {
          /* APP_URL hỏng → chỉ so request origin */
        }
      }
      if (!allowed.has(origin)) {
        return NextResponse.json({ message: "Origin không hợp lệ" }, { status: 403 });
      }
    }
  }
  // /platform: gate coarse ở Edge (chỉ verify JWT, KHÔNG đụng DB) —
  // đối chiếu PlatformAdmin Node-side trong requirePlatformAdmin.
  if (req.nextUrl.pathname.startsWith("/platform")) {
    const tok = req.cookies.get(PLATFORM_COOKIE)?.value;
    const s = await readPlatformSession(tok);
    if (!s && req.nextUrl.pathname !== "/platform/dang-nhap") {
      const url = req.nextUrl.clone();
      url.pathname = "/platform/dang-nhap";
      return securityHeaders(NextResponse.redirect(url));
    }
  }
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const session = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session || session.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/dang-nhap";
      url.searchParams.set("next", req.nextUrl.pathname);
      const res = NextResponse.redirect(url);
      return securityHeaders(res);
    }
  }
  return securityHeaders(NextResponse.next());
}

export const config = {
  // Bỏ `uploads` khỏi exclude để uploads cũng nhận security header.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
