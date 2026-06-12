import * as Sentry from '@sentry/nextjs'

// Sentry edge runtime (middleware + routes OG).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.VERCEL_ENV ?? 'development',
  tracesSampleRate: 0.1,
})
