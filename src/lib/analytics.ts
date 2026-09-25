"use client";

/**
 * Analytics nhẹ — 0 dep ngoài. 2 mode:
 *
 * 1. Plausible/Umami/GA4 bất kỳ: inject script khi NEXT_PUBLIC_ANALYTICS_SRC +
 *    NEXT_PUBLIC_ANALYTICS_DOMAIN được set (render <Script> trong layout).
 * 2. Beacon nội bộ: navigator.sendBeacon → /api/track — server tự ghi DB
 *    (ProductView, CartAdd, OrderComplete, SearchQuery...). Default OFF,
 *    bật bằng NEXT_PUBLIC_TRACK_INTERNAL=1.
 *
 * Gọi `trackEvent(name, props)` ở client components quan trọng (add-to-cart,
 * begin-checkout, purchase). Server-side tracking đặt ở `src/server/events.ts`
 * đã có sẵn — file này chỉ lo phía browser.
 */

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
    umami?: { track: (event: string, props?: Record<string, unknown>) => void };
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void;
  }
}

export const ANALYTICS_SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
export const ANALYTICS_DOMAIN = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
const INTERNAL = process.env.NEXT_PUBLIC_TRACK_INTERNAL === "1";

export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(name, { props });
    window.umami?.track(name, props);
    window.gtag?.("event", name, props);
    if (INTERNAL && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([JSON.stringify({ event: name, props, ts: Date.now(), url: location.pathname })], {
          type: "application/json",
        }),
      );
    }
  } catch {
    /* analytics fail không bao giờ chặn UX */
  }
}

export const AnalyticsEvents = {
  ViewProduct: "view_product",
  AddToCart: "add_to_cart",
  RemoveFromCart: "remove_from_cart",
  BeginCheckout: "begin_checkout",
  Purchase: "purchase",
  Search: "search",
  ApplyCoupon: "apply_coupon",
  AddToWishlist: "add_to_wishlist",
  SignUp: "sign_up",
  Login: "login",
} as const;
