import * as Sentry from '@sentry/nextjs'

// Sentry serveur (sprint 11 Bloc D). DSN public — pas un secret.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.VERCEL_ENV ?? 'development',
  // Tracing modéré : assez pour voir les routes lentes (/carte, /spots,
  // /carnet, /fil), pas de quoi cramer le quota free.
  tracesSampleRate: 0.2,
  // Bruit serveur connu : abandons de connexion clients.
  ignoreErrors: ['ECONNRESET', 'EPIPE', 'AbortError'],
})
