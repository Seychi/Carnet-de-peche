import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
