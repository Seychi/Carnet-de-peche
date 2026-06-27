// Base URL canonique du site, partagée par le partage social (sprint 38 WS-C).
// Sert à construire l'URL ABSOLUE d'une carte (`/c/{slug}`) qu'on passe à
// navigator.share — un lien relatif n'est pas partageable hors de l'onglet.
//
// Priorité : variable d'env explicite (preview Vercel) → origin du navigateur
// (client) → domaine de prod (SSR par défaut). Pas de tiret cadratin en commentaire
// de code (toléré), mais aucune copy visible ici.
const PROD_ORIGIN = 'https://www.carnet-de-peche.com'

/** Origin du site (sans slash final). Client : window.location.origin. */
export function siteOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : null)
  return (fromEnv ?? PROD_ORIGIN).replace(/\/$/, '')
}

/** URL absolue d'un chemin interne (ex. `/c/abc` → `https://…/c/abc`). */
export function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${siteOrigin()}${p}`
}

/** Chemin public d'une carte de partage. */
export function shareCardPath(slug: string): string {
  return `/c/${slug}`
}

/** URL de l'image OG d'une carte (format `og` 1200×630 par défaut, `story` 9:16). */
export function shareCardImagePath(
  slug: string,
  format: 'og' | 'story' = 'og',
): string {
  return format === 'story' ? `/og/card/${slug}?format=story` : `/og/card/${slug}`
}
