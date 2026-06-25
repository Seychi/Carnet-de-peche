// Politique de motion de la home (sprint 34).
//
// Décision John (2026-06-25) : le motion est l'IDENTITÉ produit de la home → il joue
// MÊME si l'OS/navigateur demande « moins d'animations » (prefers-reduced-motion).
// C'est un arbitrage assumé : on privilégie l'expérience de marque à la préférence
// d'accessibilité. Pour REDONNER la priorité à l'accessibilité (le motion ne joue
// alors que si l'utilisateur n'a PAS activé reduced-motion), repasse cette constante
// à `true` — c'est le SEUL endroit à changer, tous les effets en dépendent.
export const RESPECT_REDUCED_MOTION = false

/**
 * Le motion doit-il être bridé ? `true` seulement si on respecte la préférence ET que
 * l'utilisateur la demande. Avec `RESPECT_REDUCED_MOTION = false`, renvoie toujours
 * `false` → tout le motion joue. SSR-safe (no window → false).
 */
export function motionReduced(): boolean {
  if (!RESPECT_REDUCED_MOTION) return false
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Pointeur grossier (tactile) : coupe les effets qui SUIVENT le curseur (magnetic, glow,
 *  flottement) — ils n'ont aucun sens sans souris. Le motion scroll/ambient, lui, joue. */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}
