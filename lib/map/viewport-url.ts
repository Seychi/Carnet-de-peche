/**
 * Le cadrage de `/carte` porté par l'URL (audit du 15/08, P0-3, seconde moitié).
 *
 * ⚠️ Le défaut mesuré : carte zoomée → clic sur un marqueur → « Voir le spot
 * complet » → retour. La carte se remonte de zéro et revient au cadrage France
 * par défaut. Le pêcheur qui avait zoomé sur sa côte perd son travail à chaque
 * aller-retour, et sur mobile l'aller-retour EST le parcours normal.
 *
 * Pourquoi l'URL plutôt qu'un état en mémoire : au retour, le composant est
 * remonté (la page est `force-dynamic`), donc tout état React est perdu. L'URL,
 * elle, est restaurée par le navigateur — c'est le seul endroit qui survit à
 * l'aller-retour sans rien stocker chez le visiteur.
 *
 * ⚠️ Format volontairement court (`?vp=-4.4863,48.3904,11.2`) : il finit dans les
 * liens partagés et dans les journaux. Pas de coordonnée de SPOT là-dedans, juste
 * le cadre de la caméra, qui est déjà public.
 */

export const VIEWPORT_PARAM = 'vp'

export type MapViewport = {
  lng: number
  lat: number
  zoom: number
}

/** Bornes WGS84, plus une borne de zoom cohérente avec MapLibre. */
function isSane(v: MapViewport): boolean {
  return (
    Number.isFinite(v.lng) &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.zoom) &&
    v.lng >= -180 &&
    v.lng <= 180 &&
    v.lat >= -85 &&
    v.lat <= 85 &&
    v.zoom >= 0 &&
    v.zoom <= 22
  )
}

/**
 * Lit `?vp=lng,lat,zoom`. Renvoie `null` sur toute valeur absente, malformée ou
 * hors bornes : une URL bricolée ne doit jamais casser le montage de la carte,
 * elle doit juste être ignorée.
 */
export function parseViewport(search: string | null | undefined): MapViewport | null {
  if (!search) return null
  let raw: string | null
  try {
    raw = new URLSearchParams(search).get(VIEWPORT_PARAM)
  } catch {
    return null
  }
  if (!raw) return null

  const parts = raw.split(',')
  if (parts.length !== 3) return null

  const viewport: MapViewport = {
    lng: Number(parts[0]),
    lat: Number(parts[1]),
    zoom: Number(parts[2]),
  }
  // `Number('')` vaut 0, pas NaN : on refuse explicitement les segments vides,
  // sinon `?vp=,,` passerait pour le point [0,0] au zoom 0.
  if (parts.some((p) => p.trim() === '')) return null
  return isSane(viewport) ? viewport : null
}

/**
 * Sérialise le cadre. Précision volontairement basse : 4 décimales valent ~11 m,
 * largement assez pour un cadrage, et ça garde l'URL courte et stable (une URL
 * qui change à chaque pixel de déplacement produirait un bruit inutile).
 */
export function formatViewport(v: MapViewport): string {
  return `${v.lng.toFixed(4)},${v.lat.toFixed(4)},${v.zoom.toFixed(2)}`
}

/**
 * Applique le cadre à une chaîne de recherche existante, SANS toucher aux autres
 * paramètres (les filtres de la carte vivent dans la même URL).
 */
export function withViewport(search: string, v: MapViewport): string {
  const params = new URLSearchParams(search)
  params.set(VIEWPORT_PARAM, formatViewport(v))
  return params.toString()
}
