import * as Sentry from '@sentry/nextjs'

// Sentry navigateur (sprint 11 Bloc D) — filtres anti-bruit dès le setup
// pour préserver le quota free (cf brief : extensions, bots).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  tracesSampleRate: 0.1,
  // Pas de session replay en beta (quota 50/mois, pas le besoin).
  integrations: [],

  ignoreErrors: [
    // Extensions navigateur & scripts injectés
    /extension:\/\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Réseau coupé au bord de l'eau — comportement attendu, pas un bug
    'Failed to fetch',
    'NetworkError when attempting to fetch a resource',
    'Load failed',
    'AbortError',
  ],
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
  ],

  beforeSend(event) {
    // Filtre les bots évidents (pas de vrai navigateur → pas de plainte utile)
    const ua = event.request?.headers?.['User-Agent'] ?? ''
    if (/bot|crawler|spider|lighthouse|headless/i.test(ua)) return null
    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
