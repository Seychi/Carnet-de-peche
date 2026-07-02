// Filtres anti-bruit Sentry côté navigateur (sprint 70, Bloc B).
// Logique PURE extraite d'instrumentation-client.ts pour être testable (Vitest).
//
// Contexte (issues Sentry réelles, 2026-06-30) :
// - NEXTJS-A/B/C `TypeError … parentNode` : stacks 100 % dans le runtime inline
//   $RS du streaming React 19 (script injecté dans le document HTML, ex.
//   `app:///carnet:2 ($RS)`). Cause : un tiers (extension navigateur, traducteur)
//   retire le nœud de segment entre le streaming serveur et l'exécution du script.
//   Aucun removeChild de nœud streamé dans notre code (vérifié par grep sprint 70,
//   seuls des teardowns MapLibre map/marker/popup existent) → inactionnable, on droppe.
// - NEXTJS-D/E `Invalid URL` + `selectNode` : stacks 100 % dans
//   `_next-live/feedback/*.js` (Vercel Toolbar / live feedback), déclenchées par nos
//   violations CSP Report-Only → denyUrls dans instrumentation-client.ts.

/**
 * Sous-ensemble STRUCTUREL d'un ErrorEvent Sentry : pas d'import @sentry ici pour
 * garder le module pur (testable en environnement node sans side effects d'init).
 */
export type SentryEventLike = {
  message?: string
  exception?: {
    values?: Array<{
      type?: string
      value?: string
      stacktrace?: {
        frames?: Array<{ function?: string; filename?: string; abs_path?: string }>
      }
    }>
  }
}

/** UA de bot évident : pas un vrai navigateur, pas de plainte utile → à dropper. */
export function isBotUserAgent(ua: string): boolean {
  return /bot|crawler|spider|lighthouse|headless/i.test(ua)
}

/**
 * Vrai si l'erreur vient du runtime inline $RS/$RC/$RB du streaming React 19
 * (complétion de segments Suspense) : le nœud attendu a été retiré du DOM par un
 * tiers. Détection précise : message `parentNode`/`insertBefore` ET au moins une
 * frame dont la fonction est `$RS`/`$RC`/`$RB` (noms réservés du runtime React,
 * jamais définis par notre code).
 */
export function isReactStreamInterference(event: SentryEventLike): boolean {
  const exc = event.exception?.values?.[0]
  if (!exc) return false
  if (!/parentNode|insertBefore/.test(exc.value ?? '')) return false
  const frames = exc.stacktrace?.frames ?? []
  return frames.some(
    (f) => f.function === '$RS' || f.function === '$RC' || f.function === '$RB'
  )
}

/**
 * Vrai si le message ressemble à une erreur d'hydratation React (minifiée #418/#423/#425
 * ou non minifiée). N'est PAS un filtre de drop : sert à taguer l'événement pour le tri
 * (React #418 vu 1× en QA mobile sans page identifiée, sprint 70 Bloc B).
 */
export function isHydrationError(message: string): boolean {
  return /Minified React error #4(18|23|25)\b|hydration/i.test(message)
}
