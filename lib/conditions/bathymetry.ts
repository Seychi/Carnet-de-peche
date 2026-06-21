import { unstable_cache } from 'next/cache'

// ─── Bathymétrie du spot (EMODnet, open data) ─────────────────────────────────
// Profondeur RÉELLE au point du spot, source EMODnet Bathymetry / SeaDataNet
// (open data, sans clé). On n'invente aucune valeur : si le service ne répond
// pas ou si le point est hors d'eau, on n'affiche rien.

export type SpotDepth = {
  /** Profondeur centrale estimée (m, positif sous le niveau de la mer). */
  depth_m: number
  /** Zone la moins profonde (m). */
  shallow_m: number
  /** Zone la plus profonde (m). */
  deep_m: number
  source: string
}

async function _fetchSpotDepth(lat: number, lng: number): Promise<SpotDepth | null> {
  // WKT POINT(lon lat) — longitude en premier.
  const url = `https://rest.emodnet-bathymetry.eu/depth_sample?geom=POINT(${lng.toFixed(4)} ${lat.toFixed(4)})`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) })
    if (!res.ok) return null
    const j = (await res.json()) as {
      min?: number
      max?: number
      avg?: number
      smoothed?: number
    }
    // Valeurs négatives = sous le niveau de la mer. On préfère `smoothed`, sinon `avg`.
    const central = typeof j.smoothed === 'number' ? j.smoothed : j.avg
    if (typeof central !== 'number' || central >= 0) return null // hors d'eau / invalide

    const deep = typeof j.min === 'number' ? -j.min : -central // min = plus profond (plus négatif)
    const shallow = typeof j.max === 'number' ? -j.max : -central // max = moins profond

    return {
      depth_m: Math.round(-central * 10) / 10,
      shallow_m: Math.max(0, Math.round(Math.min(shallow, deep) * 10) / 10),
      deep_m: Math.round(Math.max(shallow, deep) * 10) / 10,
      source: 'EMODnet Bathymetry',
    }
  } catch {
    return null
  }
}

// Bathymétrie statique → cache long (30 jours), clé = lat/lng (arguments).
export const fetchSpotDepth = unstable_cache(_fetchSpotDepth, ['spot-depth'], {
  revalidate: 2_592_000,
})
