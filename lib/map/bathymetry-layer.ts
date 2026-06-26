// Couche carte « Fond marin » (profondeur + nature du fond) — sprint Carte-v2 / C3a.
//
// Visuel = 2 sources raster MapLibre superposées :
//   • profondeur : EMODnet Bathymetry WMS, couche `emodnet:mean` (rampe BLEUE
//     séquentielle, luminosité monotone → daltonien-safe ; NE PAS utiliser
//     `emodnet:mean_multicolour`, arc-en-ciel illisible en deutéranopie).
//   • nature du fond : EMODnet Seabed Habitats WMS, couche `eusm2025_subs_full`
//     (overlay translucide).
// Les deux endpoints sont CC-BY 4.0, CORS `*`, vérifiés en direct le 2026-06-22.
// Détails + licences : docs/carte-v2/data-sources.md.
//
// Surcharge possible des tuiles via env (ex. tuiles PMTiles auto-hébergées sur R2
// produites par scripts/bathy/) :
//   NEXT_PUBLIC_BATHY_DEPTH_TILES_URL      (template {z}/{x}/{y} ou WMS {bbox-epsg-3857})
//   NEXT_PUBLIC_BATHY_SUBSTRATE_TILES_URL
//
// Le popup « Fond / Profondeur » au clic est branché par MapShell (lookup serveur
// /api/seabed, gated Itinérant) ; ici on ne fournit que le formateur HTML (pur).

import type { Map as MapLibreMap, LayerSpecification } from 'maplibre-gl'
import type { SeabedInfo } from '@/lib/conditions/bathymetry'

export const BATHY_DEPTH_SOURCE = 'bathy-depth-src'
export const BATHY_DEPTH_LAYER = 'bathy-depth'
export const BATHY_SUBSTRATE_SOURCE = 'bathy-subs-src'
export const BATHY_SUBSTRATE_LAYER = 'bathy-subs'

// La bathy fine n'a de sens qu'en zoom rapproché. En deçà : ne RIEN charger (perf —
// pas de retour au « 8 s de chargement », cf sprint 16). Borne posée sur le LAYER.
export const BATHY_MIN_ZOOM = 9

// Borne HAUTE sur la SOURCE (overzoom) — sprint Fond marin / WS B. EMODnet ~115 m de
// résolution → au-delà de z13 on sur-échantillonne pour rien. MapLibre réutilise les
// tuiles z13 en les agrandissant (zéro requête inutile au zoom rapproché). Posée sur la
// SOURCE (≠ maxzoom de layer, qui MASQUERAIT la couche au-delà du seuil).
export const BATHY_MAX_ZOOM = 13

// Couches de spots à ignorer pour le clic « fond » (évite le double-popup avec la
// fiche spot). Couvre les DEUX modes de rendu de MapView : disques floutés Discovery
// (`fuzzy-fill`, mode HTML < 200 spots) ET clusters (`clusters`/`unclustered-spots`/
// `cluster-count`, mode cluster). Si C1 les renomme, la garde devient un no-op inoffensif.
export const SPOT_LAYER_IDS = ['fuzzy-fill', 'clusters', 'unclustered-spots', 'cluster-count'] as const

const ATTRIBUTION =
  '<a href="https://emodnet.ec.europa.eu/en/bathymetry" target="_blank" rel="noopener noreferrer">EMODnet Bathymetry</a> · ' +
  '<a href="https://emodnet.ec.europa.eu/en/seabed-habitats" target="_blank" rel="noopener noreferrer">EMODnet Seabed Habitats</a> (CC-BY 4.0)'

// Tuiles servies par NOTRE proxy (sprint Fond marin / WS A) : `app/api/seabed/tiles` fait
// le GetMap WMS server-side vers EMODnet (whitelist), neutralise les erreurs (tuile
// transparente) et cache au CDN. Le navigateur ne tape PLUS EMODnet en direct → fini les
// `Failed to fetch (CORS)` et `source image could not be decoded`. Token {bbox-epsg-3857}
// conservé ; width/height=512 (cf tileSize 512, WS B → ÷4 les requêtes par déplacement).
const PROXY_DEPTH_TILES = '/api/seabed/tiles?layer=depth&width=512&height=512&bbox={bbox-epsg-3857}'
const PROXY_SUBSTRATE_TILES = '/api/seabed/tiles?layer=substrate&width=512&height=512&bbox={bbox-epsg-3857}'

// Surcharge env (ex. PMTiles auto-hébergées R2, cf scripts/bathy/) → bascule sans toucher au code.
function depthTilesUrl(): string {
  return process.env.NEXT_PUBLIC_BATHY_DEPTH_TILES_URL || PROXY_DEPTH_TILES
}
function substrateTilesUrl(): string {
  return process.env.NEXT_PUBLIC_BATHY_SUBSTRATE_TILES_URL || PROXY_SUBSTRATE_TILES
}

// Id du 1er layer `symbol` (labels) → on insère la bathy DESSOUS pour ne pas
// masquer les noms de villes/spots.
function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  for (const l of map.getStyle().layers ?? []) if (l.type === 'symbol') return l.id
  return undefined
}

/** Ajoute la couche fond marin (lazy : appelée seulement à l'activation). */
export function addBathyLayer(map: MapLibreMap, opacity = 0.7): void {
  const beforeId = firstSymbolLayerId(map)

  if (!map.getSource(BATHY_DEPTH_SOURCE)) {
    map.addSource(BATHY_DEPTH_SOURCE, {
      type: 'raster',
      tiles: [depthTilesUrl()],
      tileSize: 512, // WS B : 512 → ÷4 le nombre de requêtes vs 256 (proxy width/height=512)
      maxzoom: BATHY_MAX_ZOOM, // overzoom au-delà : pas de requêtes inutiles (EMODnet ~115 m)
      attribution: ATTRIBUTION,
    })
  }
  if (!map.getLayer(BATHY_DEPTH_LAYER)) {
    const layer: LayerSpecification = {
      id: BATHY_DEPTH_LAYER,
      type: 'raster',
      source: BATHY_DEPTH_SOURCE,
      minzoom: BATHY_MIN_ZOOM,
      // 'raster-fade-duration':0 = pas de fondu 300 ms à chaque tuile (≠ fadeDuration
      // du constructeur Map) → évite le flicker/saccade au pan/zoom.
      paint: { 'raster-opacity': opacity, 'raster-fade-duration': 0 },
    }
    map.addLayer(layer, beforeId)
  }

  if (!map.getSource(BATHY_SUBSTRATE_SOURCE)) {
    map.addSource(BATHY_SUBSTRATE_SOURCE, {
      type: 'raster',
      tiles: [substrateTilesUrl()],
      tileSize: 512, // WS B (cf source profondeur)
      maxzoom: BATHY_MAX_ZOOM,
    })
  }
  if (!map.getLayer(BATHY_SUBSTRATE_LAYER)) {
    const layer: LayerSpecification = {
      id: BATHY_SUBSTRATE_LAYER,
      type: 'raster',
      source: BATHY_SUBSTRATE_SOURCE,
      minzoom: BATHY_MIN_ZOOM,
      // Substrat en overlay plus discret pour laisser lire la profondeur dessous.
      paint: { 'raster-opacity': opacity * 0.55, 'raster-fade-duration': 0 },
    }
    map.addLayer(layer, beforeId)
  }
}

/** Retire la couche fond marin (layers PUIS sources). */
export function removeBathyLayer(map: MapLibreMap): void {
  for (const id of [BATHY_SUBSTRATE_LAYER, BATHY_DEPTH_LAYER]) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
  for (const id of [BATHY_SUBSTRATE_SOURCE, BATHY_DEPTH_SOURCE]) {
    if (map.getSource(id)) map.removeSource(id)
  }
}

/** Règle l'opacité (substrat à 55 % de la valeur, comme à l'ajout). */
export function setBathyOpacity(map: MapLibreMap, opacity: number): void {
  if (map.getLayer(BATHY_DEPTH_LAYER)) {
    map.setPaintProperty(BATHY_DEPTH_LAYER, 'raster-opacity', opacity)
  }
  if (map.getLayer(BATHY_SUBSTRATE_LAYER)) {
    map.setPaintProperty(BATHY_SUBSTRATE_LAYER, 'raster-opacity', opacity * 0.55)
  }
}

export function isBathyActive(map: MapLibreMap): boolean {
  return !!map.getLayer(BATHY_DEPTH_LAYER)
}

// ─── Popup « Fond / Profondeur » ──────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDepth(m: number): string {
  return (Math.round(m * 10) / 10).toFixed(1).replace('.', ',')
}

/**
 * HTML du popup « Fond / Profondeur » (pur → testable). Honnête hors couverture :
 * affiche « Donnée indisponible » plutôt que d'inventer.
 */
export function buildSeabedPopupHTML(info: SeabedInfo): string {
  const fond = info.substrate
    ? `<strong>${escapeHtml(info.substrate.label)}</strong>`
    : '<span style="color:#94a3b8">indisponible ici</span>'

  const prof = info.depth
    ? `<strong>≈ ${fmtDepth(info.depth.depth_m)} m</strong>`
    : '<span style="color:#94a3b8">indisponible ici</span>'

  if (!info.depth && !info.substrate) {
    return (
      '<div style="font:13px/1.4 system-ui,sans-serif;color:#0E1A22;min-width:170px">' +
      '<div style="color:#64748b">Pas de donnée de fond à ce point (hors couverture EMODnet).</div>' +
      '</div>'
    )
  }

  return (
    '<div style="font:13px/1.45 system-ui,sans-serif;color:#0E1A22;min-width:180px">' +
    `<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#64748b">Fond</span>${fond}</div>` +
    `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:2px"><span style="color:#64748b">Profondeur</span>${prof}</div>` +
    '<div style="margin-top:6px;font-size:10px;color:#94a3b8">Source : EMODnet</div>' +
    '</div>'
  )
}
