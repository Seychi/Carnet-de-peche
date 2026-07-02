import * as Sentry from '@sentry/nextjs'
import {
  isBotUserAgent,
  isHydrationError,
  isReactStreamInterference,
} from '@/lib/sentry-filters'

// Sentry navigateur (sprint 11 Bloc D) — filtres anti-bruit dès le setup
// pour préserver le quota free (cf brief : extensions, bots).
// Sprint 70 Bloc B : filtres ciblés supplémentaires (preuves = issues NEXTJS-A→E) :
// runtime $RS du streaming React 19 saboté par des extensions, script Vercel Toolbar
// `_next-live/feedback`. Logique pure dans lib/sentry-filters.ts (testée).
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
    // Vercel Toolbar / live feedback (script tiers) : `selectNode` et `new URL()`
    // y crashent sur nos violations CSP Report-Only (issues NEXTJS-D/E, stacks 100 %
    // dans _next-live/feedback/*.js). Pas notre code → hors quota.
    /\/_next-live\//,
    /vercel\.live/,
  ],

  beforeSend(event) {
    // Filtre les bots évidents (pas de vrai navigateur → pas de plainte utile)
    const ua = event.request?.headers?.['User-Agent'] ?? ''
    if (isBotUserAgent(ua)) return null

    // Streaming React 19 : nœud de segment retiré par un tiers (extension/traducteur)
    // pendant le stream → TypeError parentNode dans le runtime inline $RS. Inactionnable
    // côté app (issues NEXTJS-A/B/C, cf lib/sentry-filters.ts) → drop.
    if (isReactStreamInterference(event)) return null

    // Hydratation React (#418/#423/#425) : on n'ignore PAS, on ENRICHIT pour le tri
    // (sprint 70 Bloc B : #418 vu 1× en QA mobile sans page identifiée → ce contexte
    // donnera la page + le viewport à la prochaine occurrence).
    const msg = event.exception?.values?.[0]?.value ?? event.message ?? ''
    if (isHydrationError(msg) && typeof window !== 'undefined') {
      event.tags = { ...event.tags, hydration: 'suspect' }
      event.contexts = {
        ...event.contexts,
        hydration: {
          pathname: window.location.pathname,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
      }
    }
    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
