// Logique PURE (testable) du proxy de tuiles « Fond marin » EMODnet (sprint Fond marin / WS A).
// Whitelist stricte (anti open-proxy) + validation bbox FR + construction de l'URL WMS GetMap.
// L'I/O (fetch, timeout, fallback) vit dans le route handler ; ici, que du déterministe.

export const EMODNET = {
  depth: { base: 'https://ows.emodnet-bathymetry.eu/wms', layers: 'emodnet:mean' },
  substrate: {
    base: 'https://ows.emodnet-seabedhabitats.eu/geoserver/emodnet_open/wms',
    layers: 'eusm2025_subs_full',
  },
} as const

export type SeabedLayer = keyof typeof EMODNET

export function isSeabedLayer(v: string | null): v is SeabedLayer {
  return v === 'depth' || v === 'substrate'
}

// Emprise FR élargie en Web Mercator (EPSG:3857) — anti open-proxy : on refuse une bbox
// entièrement hors zone (France métro + large marge Atlantique/Manche/Méditerranée/Corse).
const FR_3857 = { minX: -1_000_000, minY: 4_800_000, maxX: 1_500_000, maxY: 7_200_000 }

export function isFranceBbox(bbox: string): boolean {
  const p = bbox.split(',').map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return false
  const [minx, miny, maxx, maxy] = p
  if (minx >= maxx || miny >= maxy) return false
  // La tuile doit INTERSECTER l'emprise FR (sinon = requête hors-zone suspecte).
  return maxx >= FR_3857.minX && minx <= FR_3857.maxX && maxy >= FR_3857.minY && miny <= FR_3857.maxY
}

export function buildGetMapUrl(layer: SeabedLayer, bbox: string, size: number): string {
  const { base, layers } = EMODNET[layer]
  // WMS 1.3.0 → param CRS (pas SRS) ; pour EPSG:3857 l'ordre d'axes reste minx,miny,maxx,maxy
  // (= ce que produit le token {bbox-epsg-3857} de MapLibre). STYLES vide requis en 1.3.0.
  const qs = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers,
    styles: '',
    format: 'image/png',
    transparent: 'true',
    crs: 'EPSG:3857',
    width: String(size),
    height: String(size),
    bbox,
  })
  return `${base}?${qs.toString()}`
}

/**
 * Whitelist + validation → URL EMODnet sûre à requêter server-side, ou `null` si l'entrée
 * est invalide / hors-zone (le route handler renvoie alors une tuile transparente).
 */
export function resolveSeabedTileUrl(layer: string | null, bbox: string, size: number): string | null {
  if (!isSeabedLayer(layer)) return null
  if (!isFranceBbox(bbox)) return null
  return buildGetMapUrl(layer, bbox, size)
}
