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

// ─── Nature du fond (substrat) — EMODnet Seabed Habitats / EUSeaMap ───────────
// Source: EMODnet Seabed Habitats, couche `eusm2025_subs_full` (CC-BY 4.0, usage
// commercial autorisé avec attribution). On NE prend PAS la sédimentologie SHOM :
// elle est en CC BY-SA 4.0 NON-commerciale (cf docs/carte-v2/data-sources.md).
// Endpoint + classes vérifiés en direct le 2026-06-22 (Raz → "Rock…", Concarneau → "Sand").

export type SeabedSubstrate = {
  /** Libellé FR court, prêt à afficher (ex. « Vase », « Sable », « Roche »). */
  label: string
  /** Classe brute EMODnet (ex. « Rock or other hard substrata »). */
  raw: string
  source: string
}

// Classes substrat EUSeaMap (Folk simplifié) → libellé FR. Clés normalisées en
// minuscules + espaces compactés. On ne traduit que ce qui est connu ; sinon on
// renvoie le libellé brut (jamais d'invention).
const SUBSTRATE_FR: Record<string, string> = {
  'mud': 'Vase',
  'mud and sandy mud': 'Vase',
  'mud to muddy sand': 'Vase / vase sableuse',
  'sandy mud': 'Vase sableuse',
  'sandy mud or muddy sand': 'Vase sableuse',
  'muddy sand': 'Sable vaseux',
  'muddy sand and sandy mud': 'Sable vaseux',
  'sand': 'Sable',
  'sand and muddy sand': 'Sable',
  'coarse substrate': 'Sédiment grossier',
  'coarse sediment': 'Sédiment grossier',
  'mixed sediment': 'Sédiment mixte',
  'rock or other hard substrata': 'Roche',
  'rock and other hard substrata': 'Roche',
  'rock': 'Roche',
  'seabed': 'Fond indéterminé',
  'sediment': 'Sédiment',
  'no data at this level': 'Donnée indisponible',
}

/** Mappe une classe substrat EMODnet vers un libellé FR (fallback : libellé brut). */
export function substrateToFr(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  return SUBSTRATE_FR[key] ?? raw.trim()
}

async function _fetchSeabedSubstrate(lat: number, lng: number): Promise<SeabedSubstrate | null> {
  // WMS 1.3.0 GetFeatureInfo. En EPSG:4326 sous WMS 1.3.0, l'ordre des axes du
  // BBOX est lat,lon (vérifié en direct). On échantillonne une mini-fenêtre 101×101
  // px centrée sur le point (I=J=50). `propertyName=substrate` allège la réponse
  // (~120 Ko de géométrie → quelques octets : geometry=null, properties.substrate).
  const d = 0.001
  const bbox = `${(lat - d).toFixed(4)},${(lng - d).toFixed(4)},${(lat + d).toFixed(4)},${(lng + d).toFixed(4)}`
  const url =
    'https://ows.emodnet-seabedhabitats.eu/geoserver/emodnet_open/wms' +
    '?service=WMS&version=1.3.0&request=GetFeatureInfo' +
    '&layers=eusm2025_subs_full&query_layers=eusm2025_subs_full' +
    `&crs=EPSG:4326&bbox=${bbox}&width=101&height=101&i=50&j=50` +
    '&info_format=application/json&propertyName=substrate'
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const j = (await res.json()) as {
      features?: { properties?: { substrate?: string } }[]
    }
    const raw = j.features?.[0]?.properties?.substrate
    if (typeof raw !== 'string' || !raw.trim()) return null // hors couverture
    return {
      label: substrateToFr(raw),
      raw: raw.trim(),
      source: 'EMODnet Seabed Habitats (EUSeaMap)',
    }
  } catch {
    return null
  }
}

// Substrat statique → même cache long (30 jours) que la profondeur.
export const fetchSeabedSubstrate = unstable_cache(_fetchSeabedSubstrate, ['seabed-substrate'], {
  revalidate: 2_592_000,
})

// ─── Lookup combiné « Fond + Profondeur » (popup carte / fiche spot) ──────────
export type SeabedInfo = {
  depth: SpotDepth | null
  substrate: SeabedSubstrate | null
}

/** Profondeur + nature du fond à un point, en parallèle. Ne jette jamais. */
export async function fetchSeabedInfo(lat: number, lng: number): Promise<SeabedInfo> {
  const [depth, substrate] = await Promise.all([
    fetchSpotDepth(lat, lng).catch(() => null),
    fetchSeabedSubstrate(lat, lng).catch(() => null),
  ])
  return { depth, substrate }
}
