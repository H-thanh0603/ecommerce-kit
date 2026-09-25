import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend(event) {
    // Lọc PII trong request data — giữ stack + tag
    if (event.request?.headers) {
      const h = event.request.headers as Record<string, string>;
      delete h["cookie"];
      delete h["authorization"];
      delete h["x-forwarded-for"];
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    /^AbortError/,
  ],
});
