// Validation des cibles de redirection post-auth. ANTI OPEN-REDIRECT :
// on n'accepte QUE des chemins internes (un seul '/' en tête, pas de host,
// pas de schéma). Toute valeur suspecte → fallback.

const INTERNAL_PATH = /^\/(?!\/)[^\\\s]*$/

/**
 * Renvoie `target` s'il s'agit d'un chemin interne sûr, sinon `fallback`.
 * Sûr = commence par un unique '/', sans '//' (protocol-relative),
 * sans backslash, sans espace, longueur raisonnable.
 */
export function safeInternalPath(
  target: string | null | undefined,
  fallback = '/home',
): string {
  if (!target) return fallback
  if (target.length > 512) return fallback
  if (!INTERNAL_PATH.test(target)) return fallback
  return target
}

// Le `redirect` est passé en query string : on l'encode une fois pour la cible
// /auth/login, et on le décode/valide à la consommation.
export function buildLoginRedirect(target: string): string {
  return `/auth/login?redirect=${encodeURIComponent(target)}`
}
