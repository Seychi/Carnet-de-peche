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
 * Frames INTERNES à React qui appliquent les mutations DOM au commit. Ces noms ne
 * sont jamais définis par notre code : leur présence prouve que le plantage a eu
 * lieu pendant que React réconciliait l'arbre, pas dans un de nos handlers.
 *
 * Sprint 88, Bloc 7 : c'est l'élargissement rendu nécessaire par l'issue
 * `JAVASCRIPT-NEXTJS-1D` (`insertBefore … not a child of this node`, page traduite
 * par un outil tiers). Même phénomène que les issues A/B/C — le DOM est muté sous
 * React par un traducteur ou une extension — mais SANS frame `$RS`, parce que la
 * casse survient au commit et non à la complétion d'un segment streamé.
 */
const REACT_COMMIT_FRAMES = new Set([
  'commitMutationEffectsOnFiber',
  'commitMutationEffects',
  'recursivelyTraverseMutationEffects',
  'commitDeletionEffects',
  'commitDeletionEffectsOnFiber',
])

/**
 * Vrai si l'erreur vient d'un tiers qui a muté le DOM sous React : soit le runtime
 * inline `$RS`/`$RC`/`$RB` du streaming React 19 (complétion de segments Suspense),
 * soit la phase de commit. Dans les deux cas, le nœud que React s'attendait à
 * trouver a été déplacé ou supprimé par une extension ou un traducteur de page.
 *
 * Trois conditions, toutes nécessaires :
 *   1. le message parle de manipulation de nœud (`parentNode`, `insertBefore`,
 *      `removeChild`) ;
 *   2. ce n'est PAS une erreur d'hydratation reconnaissable — celles-là restent
 *      visibles et taguées, cf `isHydrationError` ci-dessous. C'est le garde-fou
 *      qui empêche cet élargissement d'avaler un vrai bug de notre code ;
 *   3. au moins une frame appartient au runtime interne de React.
 */
export function isReactStreamInterference(event: SentryEventLike): boolean {
  const exc = event.exception?.values?.[0]
  if (!exc) return false
  const message = exc.value ?? ''
  if (!/parentNode|insertBefore|removeChild/.test(message)) return false
  // Une vraie erreur d'hydratation ne doit JAMAIS tomber ici : elle vient de nous.
  if (isHydrationError(message)) return false
  const frames = exc.stacktrace?.frames ?? []
  return frames.some(
    (f) =>
      f.function === '$RS' ||
      f.function === '$RC' ||
      f.function === '$RB' ||
      (f.function !== undefined && REACT_COMMIT_FRAMES.has(f.function))
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
