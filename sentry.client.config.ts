import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    /^AbortError/,
    /Loading chunk/i,
    /Failed to fetch/i,
  ],
});
