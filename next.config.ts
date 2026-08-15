import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

// Analyseur de bundle (sprint 36) — no-op total sauf `ANALYZE=true` (script `pnpm analyze`).
// Wrapper le PLUS externe (il n'opère que sur la config finale, après Sentry).
const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// ── CSP en ENFORCE (sprint 70 Bloc C — fin du Report-Only posé au sprint 35) ──
// Inventaire des origines re-vérifié dans le code client le 02/07/2026 :
//  * MapLibre/MapTiler : styles + tuiles + glyphs fetchés sur api.maptiler.com ;
//    le worker MapLibre est créé via une URL blob → `worker-src blob:` requis
//    (+ `child-src blob:` en fallback navigateurs anciens) et `img-src data: blob:`
//    (doc MapLibre). PAS besoin de 'unsafe-eval' (MapLibre 5 n'évalue rien).
//  * Supabase : REST/Storage en https + Realtime en wss (https://*.supabase.co,
//    wss://*.supabase.co).
//  * PostHog EU : api_host = eu.i.posthog.com (cf PostHogProvider) — l'hôte
//    `eu.posthog.com` du Report-Only était FAUX, corrigé. posthog-js charge sa
//    config/toolbar en <script> depuis eu.i.posthog.com et eu-assets.i.posthog.com.
//  * Sentry navigateur : envoi direct vers *.ingest.(de.)sentry.io (pas de tunnel).
//  * Stripe : Checkout/Portal par REDIRECTION serveur (aucun stripe.js embarqué
//    aujourd'hui) — js.stripe.com / api.stripe.com / frame-src conservés
//    (inoffensifs, prêts pour de futurs Elements) ; `form-action` ouvre
//    checkout/billing.stripe.com car Chrome applique form-action à la redirection
//    d'une soumission de formulaire no-JS (fallback des server actions).
//  * BAN api-adresse.data.gouv.fr (CityAutocomplete) + Nominatim reverse
//    (CatchForm) appelés côté client ; Open-Meteo conservé (appelé serveur
//    aujourd'hui, gardé par défense en profondeur).
//  * Bathy EMODnet : proxifiée par /api/seabed/tiles → même origine, rien à ouvrir.
//  * api.dicebear.com : avatars seed historiques éventuels (img-src, défensif).
// `'unsafe-inline'` (script/style) requis tant qu'on n'a pas de nonce (scripts
// d'hydratation Next + styles inline). 'unsafe-eval' UNIQUEMENT en dev (React
// Refresh / sourcemaps eval de `next dev`), jamais en prod.
// Rapports de violation : on GARDE un canal actif via `report-uri` pointé sur
// l'endpoint « security » de Sentry (dérivé de NEXT_PUBLIC_SENTRY_DSN).
// `report-to` volontairement ABSENT : l'endpoint Sentry parse le format legacy
// csp-report, et Chrome ignorerait report-uri si report-to était présent.
const isDev = process.env.NODE_ENV === "development";
const isVercelPreview = process.env.VERCEL_ENV === "preview";

// Endpoint de rapport CSP Sentry : https://<host>/api/<projectId>/security/?sentry_key=<key>
// dérivé du DSN public (https://<key>@<host>/<projectId>). Null si DSN absent/invalide.
function sentryCspReportUri(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/\//g, "");
    if (!u.username || !projectId) return null;
    return `https://${u.host}/api/${projectId}/security/?sentry_key=${u.username}`;
  } catch {
    return null;
  }
}
const cspReportUri = sentryCspReportUri();

// Origine PostHog dérivée de l'env AU BUILD (revue sprint 70) : le client lit
// NEXT_PUBLIC_POSTHOG_HOST (lib/env.ts, défaut eu.i.posthog.com) — si la var
// Vercel diffère du défaut, une CSP figée en dur tuerait l'analytics en silence.
// Var absente/invalide au build → fallback sur le vrai api_host actuel.
function posthogOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").origin;
  } catch {
    return "https://eu.i.posthog.com";
  }
}
const POSTHOG_ORIGINS = Array.from(
  new Set([posthogOrigin(), "https://eu.i.posthog.com", "https://eu-assets.i.posthog.com"]),
);

const cspDirectives: Array<[string, string[]]> = [
  ["default-src", ["'self'"]],
  [
    "script-src",
    [
      "'self'",
      "'unsafe-inline'",
      "blob:",
      // `next dev` a besoin d'eval (React Refresh) — jamais en build de prod.
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://js.stripe.com",
      ...POSTHOG_ORIGINS,
      // Toolbar Vercel injectée sur les déploiements Preview uniquement.
      ...(isVercelPreview ? ["https://vercel.live"] : []),
    ],
  ],
  [
    "connect-src",
    [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.stripe.com",
      ...POSTHOG_ORIGINS,
      "https://*.sentry.io",
      "https://*.ingest.sentry.io",
      "https://*.ingest.de.sentry.io",
      "https://api.maptiler.com",
      "https://*.maptiler.com",
      "https://api-adresse.data.gouv.fr",
      "https://nominatim.openstreetmap.org",
      "https://marine-api.open-meteo.com",
      "https://api.open-meteo.com",
      ...(isVercelPreview ? ["https://vercel.live", "wss://*.pusher.com"] : []),
    ],
  ],
  [
    "img-src",
    [
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co",
      "https://*.maptiler.com",
      "https://*.tile.openstreetmap.org",
      "https://*.openstreetmap.org",
      "https://images.unsplash.com",
      "https://api.dicebear.com",
      "https://eu-assets.i.posthog.com",
      ...(isVercelPreview ? ["https://vercel.live", "https://assets.vercel.com"] : []),
    ],
  ],
  ["style-src", ["'self'", "'unsafe-inline'"]],
  [
    "font-src",
    ["'self'", "data:", ...(isVercelPreview ? ["https://vercel.live", "https://assets.vercel.com"] : [])],
  ],
  [
    "frame-src",
    [
      "https://js.stripe.com",
      "https://checkout.stripe.com",
      "https://hooks.stripe.com",
      ...(isVercelPreview ? ["https://vercel.live"] : []),
    ],
  ],
  ["worker-src", ["'self'", "blob:"]],
  // Fallback de worker-src pour les navigateurs qui ne le supportent pas.
  ["child-src", ["'self'", "blob:"]],
  ["manifest-src", ["'self'"]],
  ["object-src", ["'none'"]],
  ["base-uri", ["'self'"]],
  // form-action s'applique aussi à la CHAÎNE de redirections d'une soumission
  // no-JS (fallback des server actions) : Stripe (Checkout/Portal) ET le login
  // Google (redirect 303 vers <ref>.supabase.co/auth/v1/authorize puis
  // accounts.google.com) doivent être ouverts, sinon « Continuer avec Google »
  // cliqué avant hydratation est bloqué par la CSP (revue sprint 70).
  [
    "form-action",
    [
      "'self'",
      "https://checkout.stripe.com",
      "https://billing.stripe.com",
      "https://*.supabase.co",
      "https://accounts.google.com",
    ],
  ],
  // Redondant avec X-Frame-Options: DENY (frame-ancestors prime, navigateurs modernes).
  ["frame-ancestors", ["'none'"]],
  ...(cspReportUri ? ([["report-uri", [cspReportUri]]] as Array<[string, string[]]>) : []),
];

const csp = cspDirectives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");

const nextConfig: NextConfig = {
  // ── Skew Protection (audit du 15/08, P0-3) ──────────────────────────────────
  // Les assets `_next/static/...` ne portaient aucun `?dpl=` : un visiteur qui
  // avait la page ouverte PENDANT un déploiement voyait ses requêtes RSC échouer,
  // parce qu'elles allaient chercher des chunks de la version précédente. Mesuré
  // le 15/08 : 5 déploiements dans la journée, et un **503 capturé** sur
  // `/spots/bec-de-sormiou-osm747711726?_rsc=…` à 13h43. La frontière d'erreur
  // `app/(map)/error.js` se déclenche alors, ce qui donne exactement le symptôme
  // signalé : « la carte se reset et plus aucun spot n'apparaît ».
  //
  // ⚠️ L'audit cite `experimental.useDeploymentId` : cette clé N'EXISTE PAS en
  // Next 15.5 (vérifié dans `config-shared.d.ts`, `tsc` la refuse). La bonne clé
  // est `deploymentId` au premier niveau, alimentée par la variable que Vercel
  // injecte quand Skew Protection est active.
  //
  // ⚠️ Ne suffit PAS seule : il faut AUSSI cocher Skew Protection côté Vercel
  // (Settings → Advanced). Sans elle, `VERCEL_DEPLOYMENT_ID` est absente, la clé
  // vaut `undefined` et le comportement est strictement celui d'aujourd'hui.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
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
  // En-têtes de sécurité (sprint 35, durcis au sprint 70 Bloc C). CSP en ENFORCE
  // (cf. `cspDirectives` ci-dessus) + Permissions-Policy : caméra/micro coupés,
  // géolocalisation limitée à la même origine (le log de prise l'utilise).
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
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

// Sentry (sprint 11 Bloc D). L'upload des source maps ne s'active que si
// SENTRY_AUTH_TOKEN est présent (intégration Vercel↔Sentry ou token manuel) —
// sans token, le build reste inchangé.
export default withAnalyzer(withSentryConfig(nextConfig, {
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
}));
