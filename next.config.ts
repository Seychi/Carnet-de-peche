import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// CSP en Report-Only (sprint 35 / finding audit 2026-06-26 : en-têtes HTTP absents).
// ⚠️ Report-Only UNIQUEMENT ce sprint : on collecte les violations sans rien casser
// (MapLibre/MapTiler, Stripe, PostHog EU, Supabase, Sentry, BAN, Nominatim, Open-Meteo).
// NE PAS passer en `Content-Security-Policy` (enforce) avant analyse des rapports.
// `'unsafe-inline'` requis tant qu'on n'a pas de nonce (scripts d'hydratation Next).
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' blob: https://js.stripe.com https://eu.posthog.com https://eu-assets.i.posthog.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://eu.posthog.com https://eu-assets.i.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://api.maptiler.com https://*.maptiler.com https://api-adresse.data.gouv.fr https://nominatim.openstreetmap.org https://marine-api.open-meteo.com https://api.open-meteo.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.maptiler.com https://*.tile.openstreetmap.org https://*.openstreetmap.org https://images.unsplash.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Limite de body des Server Actions (sprint 20). Défaut Next = 1 Mo : un WebP de
  // prise pouvait le dépasser → « Body exceeded 1 MB limit » (500 framework AVANT
  // que l'action ne s'exécute). On porte à 2 Mo pour : (1) de la marge sur l'overhead
  // multipart, (2) laisser le garde interne de l'action (toast FR ~1,8 Mo) se déclencher
  // au lieu d'un 500. En Next 15.5 la clé est sous `experimental.serverActions`.
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Lint BLOQUANT au build (sprint 11.5) : eslint-config-next réaligné sur la
  // ligne 15 via FlatCompat (cf eslint.config.mjs) + dette lint soldée → plus
  // de bug "circular JSON" v16, `next build` lint sans crash. Ne PAS réintroduire
  // eslint.ignoreDuringBuilds : on veut que le lint casse le build s'il régresse.
  // Les guides MDX sont lus du filesystem au runtime (ISR) : il faut les
  // embarquer dans le bundle serverless Vercel (le tracing statique ne voit
  // pas les fs.readdir dynamiques).
  outputFileTracingIncludes: {
    "/guides/[slug]": ["./content/guides/**"],
    "/guides": ["./content/guides/**"],
    "/sitemap.xml": ["./content/guides/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "glgciwwnpmgifyhbvxsw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Fix SPÉCIFIQUE au poste Windows de John : pnpm résout les symlinks avec deux
  // casings différents (Carnet-de-peche vs carnet-de-peche), ce qui fait charger
  // certains modules Next.js en double et casse GlobalLayoutRouterContext.
  // No-op sur Linux (CI/Vercel) mais embarqué dans la config de prod → ne PAS
  // retirer sans re-tester un build local sur sa machine.
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
  // En-têtes de sécurité (sprint 35 / finding audit 2026-06-26). En-têtes fermes sur
  // toutes les routes + CSP en Report-Only (cf. `cspReportOnly` ci-dessus : observation
  // seule, ne casse rien). À passer en enforce dans un sprint ultérieur après analyse.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
    ];
  },
};

// Sentry (sprint 11 Bloc D). L'upload des source maps ne s'active que si
// SENTRY_AUTH_TOKEN est présent (intégration Vercel↔Sentry ou token manuel) —
// sans token, le build reste inchangé.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Tree-shake les logs de debug internes du SDK (remplace disableLogger, déprécié).
  webpack: { treeshake: { removeDebugLogging: true } },
  // Session Replay non utilisé (aucun replayIntegration) : on retire son code du bundle.
  // ⚠️ Ne PAS ajouter excludeTracing — le performance monitoring (tracesSampleRate) est actif.
  bundleSizeOptimizations: {
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },
  widenClientFileUpload: true,
});
