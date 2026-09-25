import { DEFAULT_LOCALE, isLocale, negotiateLocale, type Locale } from "@/lib/i18n";

const COOKIE = "ek-lang";

/** Client: đọc cookie ek-lang. */
export function getLocaleClient(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  const v = m ? decodeURIComponent(m[1]) : null;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export function setLocaleClient(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** Server: cookie > Accept-Language. */
export function resolveLocale(headers: Headers): Locale {
  const cookieHeader = headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
  const v = m ? decodeURIComponent(m[1]) : null;
  if (isLocale(v)) return v;
  return negotiateLocale(headers.get("accept-language"));
}
