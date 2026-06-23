// Couche « Qualité » par espèce (Carte v2 / C3b, Bloc B+C).
// Source de données = RPC get_quality_cells (migration 044) : par cellule de grille,
// un score 0-100 DÉCOMPOSABLE { communauté (k-anon K=3, geom_public JAMAIS geom) +
// perso (carnet du viewer, Itinérant) }. La composante donnée/fond (C3a, EMODnet)
// n'est PAS dans ce score : elle est récupérée à la demande au clic (popup).
//
// Le client ne reçoit que des centroïdes de grille + des agrégats — aucune coord précise.
// Garde-fou n°1 (honnêteté 7.5) : le popup montre la DÉCOMPOSITION, jamais juste une note ;
// une composante absente est dite, pas simulée.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExpressionSpecification } from 'maplibre-gl'
import type { QualityLevel } from '@/lib/solunar/types'
import { QUALITY_MARKER_COLORS, QUALITY_NEUTRAL_COLOR } from '@/lib/map/utils'
import { SPECIES_LABELS } from '@/lib/labels'
import type { SuitabilityAssessment } from '@/lib/conditions/species-habitat'

// ── Identifiants source / couches ───────────────────────────────────────────────
export const QUALITY_SOURCE = 'quality-grid-src'
export const QUALITY_FILL_LAYER = 'quality-grid-fill'   // cellules colorées
export const QUALITY_LABEL_LAYER = 'quality-grid-label' // chiffre du score (2e canal, daltonien)

// Couches spots de MapView : on insère la grille SOUS elles (beforeId) pour que les
// markers restent cliquables au-dessus. Couvre les 2 modes de rendu (HTML + cluster).
export const QUALITY_SPOT_LAYER_IDS = ['fuzzy-fill', 'clusters', 'unclustered-spots', 'cluster-count'] as const

// La grille de qualité n'a de sens qu'à partir d'un zoom régional rapproché : en deçà,
// la heatmap (C1) couvre la vue large. Borne posée sur le LAYER (perf).
export const QUALITY_MIN_ZOOM = 7

// ── Couleur / opacité data-driven (cividis, colorblind-safe) ────────────────────
// Source unique de palette = QUALITY_MARKER_COLORS (lib/map/utils), DÉJÀ validée
// daltonien (luminosité monotone sous deutéran/protan/tritan). L'info passe par la
// LUMINOSITÉ + l'opacité + le CHIFFRE du score (label), jamais par la teinte seule.
export const QUALITY_FILL_COLOR_EXPR: ExpressionSpecification = [
  'match', ['get', 'quality'],
  'faible', QUALITY_MARKER_COLORS.faible,
  'moyenne', QUALITY_MARKER_COLORS.moyenne,
  'bonne', QUALITY_MARKER_COLORS.bonne,
  'tres_bonne', QUALITY_MARKER_COLORS.tres_bonne,
  'exceptionnelle', QUALITY_MARKER_COLORS.exceptionnelle,
  QUALITY_NEUTRAL_COLOR,
]

// 2e canal anti-daltonisme : l'opacité monte avec la qualité (en plus du chiffre).
export const QUALITY_FILL_OPACITY_EXPR: ExpressionSpecification = [
  'match', ['get', 'quality'],
  'faible', 0.32,
  'moyenne', 0.42,
  'bonne', 0.54,
  'tres_bonne', 0.66,
  'exceptionnelle', 0.8,
  0.4,
]

// ── Types ────────────────────────────────────────────────────────────────────────
export type QualityBBox = { minLng: number; minLat: number; maxLng: number; maxLat: number }
export type QualityFilters = { species?: string | null; technique?: string | null; days: number }

export type QualityCell = {
  lng: number
  lat: number
  cellSize: number
  communityCount: number
  fishersCount: number
  persoCount: number
  communityNorm: number
  persoNorm: number
  score: number
  quality: QualityLevel
}

// Propriétés SCALAIRES portées par chaque feature (MapLibre stringifie les objets
// imbriqués dans `properties` → on aplatit tout en scalaires, cf docs-researcher).
export type QualityCellProps = {
  score: number
  quality: string
  community_count: number
  fishers_count: number
  perso_count: number
  cx: number // centre cellule (pour ancrer le popup)
  cy: number
  cs: number // taille de cellule (deg) — pour résoudre un spot dans la cellule
}

type QualityRow = {
  lng: number
  lat: number
  cell_size: number
  community_count: number
  fishers_count: number
  perso_count: number
  community_norm: number
  perso_norm: number
  score: number
  quality: string
}

const VALID_QUALITY: QualityLevel[] = ['faible', 'moyenne', 'bonne', 'tres_bonne', 'exceptionnelle']

function coerceQuality(q: string): QualityLevel {
  return (VALID_QUALITY as string[]).includes(q) ? (q as QualityLevel) : 'faible'
}

export const EMPTY_FC: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
  type: 'FeatureCollection',
  features: [],
}

// Construit un carré (Polygon) par cellule : centroïde (= nœud de grille) ± demi-cellule.
// La grille est en DEGRÉS (comme le snap SQL) → le carré est un carré en degrés.
export function cellsToSquareGeoJSON(
  cells: QualityCell[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon, QualityCellProps> {
  return {
    type: 'FeatureCollection',
    features: cells.map((c) => {
      const h = c.cellSize / 2
      const ring: [number, number][] = [
        [c.lng - h, c.lat - h],
        [c.lng + h, c.lat - h],
        [c.lng + h, c.lat + h],
        [c.lng - h, c.lat + h],
        [c.lng - h, c.lat - h],
      ]
      return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {
          score: c.score,
          quality: c.quality,
          community_count: c.communityCount,
          fishers_count: c.fishersCount,
          perso_count: c.persoCount,
          cx: c.lng,
          cy: c.lat,
          cs: c.cellSize,
        },
      }
    }),
  }
}

// Appelle la RPC. Renvoie [] sur erreur (couche juste vide, jamais bloquante).
export async function fetchQualityCells(
  supabase: SupabaseClient,
  bbox: QualityBBox,
  zoom: number,
  filters: QualityFilters,
): Promise<QualityCell[]> {
  const { data, error } = await supabase.rpc('get_quality_cells', {
    min_lng: bbox.minLng,
    min_lat: bbox.minLat,
    max_lng: bbox.maxLng,
    max_lat: bbox.maxLat,
    p_zoom: Math.round(zoom),
    p_species: filters.species ?? undefined,
    p_technique: filters.technique ?? undefined,
    p_days: filters.days,
  })
  if (error || !data) {
    if (error) console.warn('[quality] get_quality_cells error', error.message)
    return []
  }
  return (data as QualityRow[]).map((r) => ({
    lng: r.lng,
    lat: r.lat,
    cellSize: r.cell_size,
    communityCount: r.community_count,
    fishersCount: r.fishers_count,
    persoCount: r.perso_count,
    communityNorm: r.community_norm,
    persoNorm: r.perso_norm,
    score: r.score,
    quality: coerceQuality(r.quality),
  }))
}

// ── Libellés + légende ──────────────────────────────────────────────────────────
export const QUALITY_FR: Record<QualityLevel, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  bonne: 'Bonne',
  tres_bonne: 'Très bonne',
  exceptionnelle: 'Exceptionnelle',
}

// Légende (du plus haut au plus bas) pour le sélecteur de couches.
export const QUALITY_LEGEND: { quality: QualityLevel; label: string; color: string }[] = [
  { quality: 'exceptionnelle', label: 'Exceptionnelle', color: QUALITY_MARKER_COLORS.exceptionnelle },
  { quality: 'tres_bonne', label: 'Très bonne', color: QUALITY_MARKER_COLORS.tres_bonne },
  { quality: 'bonne', label: 'Bonne', color: QUALITY_MARKER_COLORS.bonne },
  { quality: 'moyenne', label: 'Moyenne', color: QUALITY_MARKER_COLORS.moyenne },
  { quality: 'faible', label: 'Faible', color: QUALITY_MARKER_COLORS.faible },
]

// ── Popup explicatif (le différenciateur : on montre le POURQUOI) ───────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function speciesLabel(species: string | null | undefined): string {
  if (!species) return 'toutes espèces'
  return SPECIES_LABELS[species] ?? species
}

// État de la composante « donnée/fond » (récupérée à la demande, Itinérant).
export type FondState =
  | { kind: 'hidden' }                                   // non-Itinérant : verrouillé/upsell
  | { kind: 'loading' }
  | { kind: 'done'; assessment: SuitabilityAssessment | null }
  | { kind: 'unavailable' }

export type QualityPopupVM = {
  props: QualityCellProps
  species: string | null
  days: number
  tier: 'anonymous' | 'discovery' | 'local' | 'itinerant'
  fond: FondState
  spotLink?: { slug: string; name: string } | null
}

const VERDICT_COLOR: Record<string, string> = {
  favorable: '#0E9488', // teal-600
  moyen: '#B7791F',     // gold-ish
  peu: '#E5604F',       // coral-500
  pelagique: '#64748b', // ink
  inconnu: '#94a3b8',
}

// Petit bloc « ligne de composante » du popup.
function row(label: string, value: string): string {
  return (
    `<div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-top:4px">` +
    `<span style="color:#64748b;flex-shrink:0">${label}</span>` +
    `<span style="text-align:right">${value}</span></div>`
  )
}

/**
 * HTML du popup « Qualité » DÉCOMPOSÉ (pur → testable). Montre la note PUIS le
 * pourquoi : communauté + fond + perso. Chaque composante absente est dite
 * honnêtement, jamais simulée (garde-fou 7.5). Le chiffre du score (font-mono) porte
 * l'info — indépendant de la teinte (daltonien).
 */
export function buildQualityPopupHTML(vm: QualityPopupVM): string {
  const { props: p, species, days, tier, fond } = vm
  const q = coerceQuality(p.quality)
  const color = QUALITY_MARKER_COLORS[q]
  const isItinerant = tier === 'itinerant'

  // En-tête : pastille couleur (cividis) + libellé + score chiffré (font-mono = l'info).
  const header =
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">` +
    `<span style="width:11px;height:11px;border-radius:3px;background:${color};border:1px solid rgba(4,20,28,.35);flex-shrink:0"></span>` +
    `<span style="font-weight:600;color:#0E1A22">Qualité : ${QUALITY_FR[q]}</span>` +
    `<span style="margin-left:auto;font-family:ui-monospace,'JetBrains Mono',monospace;font-weight:700;color:#0E1A22">${p.score}<span style="color:#94a3b8;font-weight:400">/100</span></span>` +
    `</div>` +
    `<div style="font-size:11px;color:#94a3b8;margin-bottom:6px">Pour : <strong style="color:#475569">${escapeHtml(speciesLabel(species))}</strong></div>`

  // 1) Communauté — k-anon. Révélée seulement si counts >= K (sinon mention honnête).
  const num = (n: number) =>
    `<strong style="font-family:ui-monospace,'JetBrains Mono',monospace">${n}</strong>`
  const community =
    p.community_count >= 3
      ? row('Communauté', `${num(p.community_count)} prises · ${num(p.fishers_count)} pêcheurs <span style="color:#94a3b8">(${days} j)</span>`)
      : row('Communauté', `<span style="color:#94a3b8">pas encore assez de prises partagées ici</span>`)

  // 2) Fond — donnée mesurée (Itinérant). Loading → mesure → verdict, ou verrou/upsell.
  let fondRow: string
  if (!isItinerant) {
    fondRow = row('Fond adapté ?', `<span style="color:#94a3b8">🔒 Itinérant</span>`)
  } else if (fond.kind === 'loading') {
    fondRow = row('Fond', `<span style="color:#94a3b8">analyse…</span>`)
  } else if (fond.kind === 'unavailable') {
    fondRow = row('Fond', `<span style="color:#94a3b8">indisponible ici</span>`)
  } else if (fond.kind === 'done' && fond.assessment) {
    const a = fond.assessment
    const c = VERDICT_COLOR[a.verdict] ?? '#64748b'
    fondRow =
      `<div style="margin-top:4px">` +
      `<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#64748b">Fond</span>` +
      `<strong style="color:${c};text-align:right">${escapeHtml(a.label)}</strong></div>` +
      `<div style="font-size:11px;color:#64748b;margin-top:2px;line-height:1.4">${escapeHtml(a.detail)}</div></div>`
  } else {
    fondRow = row('Fond', `<span style="color:#94a3b8">—</span>`)
  }

  // 3) Perso — carnet du viewer (Itinérant). Affiché seulement si >0 (sinon omis : honnête).
  let persoRow = ''
  if (isItinerant && p.perso_count > 0) {
    persoRow = row('Ton carnet', `tu y as pris ${num(p.perso_count)} ${escapeHtml(speciesLabel(species))} <span style="color:#94a3b8">(${days} j)</span>`)
  }

  // Upsell pour les non-Itinérant (la qualité complète = fond adapté + ton historique).
  const upsell = !isItinerant
    ? `<a href="/tarifs" style="display:block;margin-top:8px;padding:6px 8px;border-radius:8px;background:rgba(217,165,60,.15);color:#B7791F;font-size:11px;font-weight:600;text-decoration:none;text-align:center">Débloque la qualité complète — fond adapté + ton historique (Itinérant)</a>`
    : ''

  // Lien fiche spot si un spot curé est dans la cellule.
  const spot = vm.spotLink
    ? `<a href="/spots/${encodeURIComponent(vm.spotLink.slug)}" style="display:block;margin-top:8px;font-size:12px;color:#0E9488;font-weight:600;text-decoration:none">→ ${escapeHtml(vm.spotLink.name)}</a>`
    : ''

  return (
    `<div style="font:13px/1.45 system-ui,sans-serif;color:#0E1A22;min-width:210px;max-width:260px">` +
    header + community + fondRow + persoRow + upsell + spot +
    `<div style="margin-top:7px;font-size:10px;color:#b8c0c7">Qualité décomposée — aucune donnée simulée.</div>` +
    `</div>`
  )
}
