'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker, GeoJSONSource, ExpressionSpecification, Subscription } from 'maplibre-gl'
import { type SpotMarker, createFuzzyCircle, markerColorForQuality, QUALITY_MARKER_COLORS, QUALITY_NEUTRAL_COLOR } from '@/lib/map/utils'
import { scheduleReliableResize, resizeIfSized } from '@/lib/map/resize'
import MapSkeleton from '@/components/map/MapSkeleton'

// ── Constantes ────────────────────────────────────────────────────────────────

// En-dessous de ce seuil → marqueurs HTML (meilleure UX popup).
// Au-dessus → clustering GeoJSON natif MapLibre (performance).
const MAX_HTML_MARKERS = 200

const TEAL_500 = '#14B8A6'
const TEAL_600 = '#0E9488'
const TEAL_700 = '#0F766E'
const GOLD_500 = '#D9A53C'
const FRANCE_CENTER: [number, number] = [-2.5, 47.0]

// Couleur data-driven d'un feature GeoJSON selon sa propriété `quality`.
// Rampe viridis colorblind-safe — source unique : QUALITY_MARKER_COLORS de
// lib/map/utils (l'info passe par la luminosité, pas par la teinte).
const QUALITY_COLOR_EXPR: ExpressionSpecification = [
  'match',
  ['get', 'quality'],
  'faible', QUALITY_MARKER_COLORS.faible,
  'moyenne', QUALITY_MARKER_COLORS.moyenne,
  'bonne', QUALITY_MARKER_COLORS.bonne,
  'tres_bonne', QUALITY_MARKER_COLORS.tres_bonne,
  'exceptionnelle', QUALITY_MARKER_COLORS.exceptionnelle,
  QUALITY_NEUTRAL_COLOR,
]

// Layers mode HTML (spots < MAX_HTML_MARKERS)
const FUZZY_SOURCE = 'fuzzy-spots'
const FUZZY_FILL_LAYER = 'fuzzy-fill'
const FUZZY_LINE_LAYER = 'fuzzy-line'

// Layers mode cluster (spots >= MAX_HTML_MARKERS)
const CLUSTER_SOURCE = 'clustered-spots'
const CLUSTER_LAYER = 'clusters'
const CLUSTER_COUNT_LAYER = 'cluster-count'
const UNCLUSTERED_LAYER = 'unclustered-spots'

// ── Types ─────────────────────────────────────────────────────────────────────

type MapViewProps = {
  spots: SpotMarker[]
  nearbySpotIds?: Set<string>
  initialCenter?: [number, number]
  initialZoom?: number
  /**
   * Cadre initial (sud-ouest, nord-est). Prioritaire sur `initialCenter`/
   * `initialZoom` : MapLibre dérive alors le zoom du RATIO RÉEL du conteneur,
   * ce qu'une valeur en dur ne sait pas faire (sprint 80, Bloc 3).
   */
  initialBounds?: [[number, number], [number, number]]
  onMarkerClick?: (spot: SpotMarker) => void
  onMapReady?: (map: MapLibreMap) => void
  className?: string
  interactive?: boolean
  /** Gestes coopératifs : zoom molette → ctrl/⌘ requis, pan tactile → 2 doigts. Le
   *  scroll vertical 1 doigt traverse la carte (pas de scroll-trap) ; le TAP reste
   *  actif (clic marqueur OK). Idéal pour une carte EMBARQUÉE dans une page (home). */
  cooperativeGestures?: boolean
}

type MapError = 'missing-key' | 'no-webgl' | 'init-error'
type MaplibreModule = typeof import('maplibre-gl')

// ── Résilience de chargement (audit 2026-07-02 §3.6 : embed home flaky) ───────
// Échec transitoire (style/tuiles/contexte WebGL) → 1 reprise auto silencieuse
// (le skeleton reste affiché), puis fallback honnête avec bouton « Réessayer ».
const MAX_AUTO_RETRIES = 1
const AUTO_RETRY_DELAY_MS = 1_500
// Délai de grâce après une erreur MapLibre pré-load : un tile 4xx isolé ne doit pas
// condamner la carte si le style finit par charger.
const STYLE_FAIL_GRACE_MS = 2_500

// Sonde le support WebGL RÉEL du navigateur. `new maplibre.Map()` peut échouer de
// façon transitoire (contexte GPU saturé, driver qui redémarre) : sans cette sonde,
// on affichait « Ton navigateur ne supporte pas la carte » à tort au 1er chargement
// (fallback mensonger, audit 2026-07-02 §3.6).
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

// Lecture coords + zoom mono (DA v2, réf carte.html) — écrite directement dans
// le DOM (pas de state React : ça bouge à chaque frame de pan).
function writeReadout(map: MapLibreMap, el: HTMLSpanElement | null) {
  if (!el) return
  const c = map.getCenter()
  const latTxt = `${Math.abs(c.lat).toFixed(4)}°${c.lat >= 0 ? 'N' : 'S'}`
  const lngTxt = `${Math.abs(c.lng).toFixed(4)}°${c.lng >= 0 ? 'E' : 'O'}`
  el.textContent = `${latTxt} · ${lngTxt} · Z${map.getZoom().toFixed(1)}`
}

// ── Mode HTML : marqueurs custom + disques floutés ────────────────────────────

function createPinElement(spot: SpotMarker): HTMLElement {
  // <button> = navigable au clavier (Tab + Entrée) + annoncé par les lecteurs d'écran
  const wrapper = document.createElement('button')
  wrapper.type = 'button'
  // NB : ne PAS forcer `position` ici. MapLibre applique `position: absolute` via
  // sa classe `.maplibregl-marker` pour repositionner le marqueur au pan/zoom.
  // Un style inline `position: relative` écraserait cette règle → marqueurs mal
  // placés qui glissent au zoom. Le marqueur reste un bloc conteneur pour ses
  // anneaux enfants (en position: absolute) même sans `position` explicite.
  wrapper.style.cssText =
    'cursor: pointer; width: 26px; height: 26px; background: none; border: none; padding: 0;'
  // Tooltip/label enrichi pour les spots curés : le badge ✓ = « coordonnée
  // vérifiée à la main, fixe » (pas un point communautaire approximatif). On
  // double l'info couleur du badge par du TEXTE (daltonisme) au survol + lecteur
  // d'écran.
  const isVerifiedCoord = spot.source === 'curated'
  // Libellé de provenance (doublé en texte pour le daltonisme + lecteurs d'écran).
  const sourceLabel =
    spot.source === 'curated'
      ? 'Coordonnée vérifiée à la main, fixe.'
      : spot.source === 'community'
        ? 'Spot proposé par la communauté, coordonnée non vérifiée.'
        : spot.source === 'imported'
          ? 'Structure importée (OpenStreetMap), coordonnée non vérifiée.'
          : null
  wrapper.title = isVerifiedCoord
    ? `${spot.name} · ✓ Coordonnée vérifiée à la main`
    : spot.name
  wrapper.setAttribute(
    'aria-label',
    sourceLabel ? `Spot : ${spot.name}. ${sourceLabel}` : `Spot : ${spot.name}`,
  )

  // Couleur de base selon la qualité — mémorisée pour la restaurer après un
  // highlight nearby (cf. dataset.qcolor dans l'effet nearby).
  const color = markerColorForQuality(spot.dayQuality)
  wrapper.dataset.qcolor = color

  // Ring "exceptionnelle" : pulse permanent (uniquement les meilleurs spots)
  if (spot.dayQuality === 'exceptionnelle') {
    const exc = document.createElement('div')
    exc.className = 'marker-exceptional-ring'
    wrapper.appendChild(exc)
  }

  // Anneau de pulse — activé via JS quand le spot est nearby
  const ring = document.createElement('div')
  ring.className = 'marker-nearby-ring'
  wrapper.appendChild(ring)

  // Pastille DA v2 (réf maquette carte) : cercle plein couleur score,
  // bordure blanche. Le chiffre du score viendra quand get_spots_for_map
  // l'exposera (cf docs/sprint-10.5/QUESTIONS.md).
  const dot = document.createElement('div')
  dot.className = 'marker-dot'
  dot.style.cssText =
    `position: absolute; inset: 0; border-radius: 50%; background: ${color}; ` +
    'border: 2px solid #fff; box-shadow: 0 2px 8px rgba(4,20,28,.3);'
  wrapper.appendChild(dot)

  // ⟢ MERGE C2 (sprint Carte-v2) — badge « Vérifié » (garantie éditoriale)
  // UNIQUEMENT pour les spots curés (source==='curated'). L'icône ✓ porte
  // l'info par sa FORME, pas seulement la couleur (daltonisme).
  //
  // ⟢ Sprint 41 / WS C — lisibilité des sources : les spots communautaires et
  // importés (OSM) ne portent JAMAIS le ✓, mais reçoivent un repère de PROVENANCE
  // distinct par sa FORME (pas par la teinte seule) :
  //   • communautaire → pastille « ~ » (point proposé, à confirmer) ;
  //   • importé (OSM) → pastille « ◦ » (structure repérée, non vérifiée).
  // Daltonien-safe : forme + glyphe + title/aria texte.
  if (spot.source === 'curated') {
    const badge = document.createElement('div')
    badge.className = 'marker-verified-badge'
    badge.setAttribute('aria-hidden', 'true')
    badge.title = 'Coordonnée vérifiée à la main, fixe'
    badge.textContent = '✓'
    wrapper.appendChild(badge)
  } else if (spot.source === 'community') {
    const badge = document.createElement('div')
    badge.className = 'marker-source-badge marker-source-community'
    badge.setAttribute('aria-hidden', 'true')
    badge.title = 'Spot proposé par la communauté, coordonnée non vérifiée'
    badge.textContent = '~'
    wrapper.appendChild(badge)
  } else if (spot.source === 'imported') {
    const badge = document.createElement('div')
    badge.className = 'marker-source-badge marker-source-imported'
    badge.setAttribute('aria-hidden', 'true')
    badge.title = 'Structure importée (OpenStreetMap), coordonnée non vérifiée'
    badge.textContent = '◦'
    wrapper.appendChild(badge)
  }

  return wrapper
}

// Disques floutés (1 km) des spots sans abonnement (coordonnées non précises en
// Discovery). Donnée à part de la création des couches pour pouvoir resynchroniser
// au changement de filtre via setData (sans recréer source/layers).
function buildFuzzyData(spots: SpotMarker[]) {
  return {
    type: 'FeatureCollection' as const,
    features: spots.filter((s) => !s.isPrecise).map((s) => createFuzzyCircle(s, 1)),
  }
}

// Source + layers des disques floutés, initialisés VIDES — le peuplement passe
// toujours par setData (effet de resync), y compris au premier rendu.
function addFuzzyLayers(
  map: MapLibreMap,
  getSpotById: (id: string) => SpotMarker | undefined,
  onMarkerClick?: (spot: SpotMarker) => void,
): Subscription[] {
  map.addSource(FUZZY_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: FUZZY_FILL_LAYER,
    type: 'fill',
    source: FUZZY_SOURCE,
    paint: { 'fill-color': QUALITY_COLOR_EXPR, 'fill-opacity': 0.2 },
  })
  map.addLayer({
    id: FUZZY_LINE_LAYER,
    type: 'line',
    source: FUZZY_SOURCE,
    paint: { 'line-color': QUALITY_COLOR_EXPR, 'line-width': 1.5 },
  })
  return subscribeFuzzyHandlers(map, getSpotById, onMarkerClick)
}

/**
 * ★ Sprint 88, Bloc 5 — inscription des listeners DÉLÉGUÉS, séparée de la création
 * des couches.
 *
 * Les deux sont séparés parce qu'ils n'ont pas le même cycle de vie : après un
 * incident GPU, MapLibre restaure le style et donc les couches tout seul
 * (`_contextRestored`, dist/maplibre-gl-dev.js:71350), mais les listeners, eux,
 * doivent être re-posés à la main. Rejouer `addFuzzyLayers` échouerait sur
 * `addSource` (la source existe déjà).
 *
 * `map.on(type, layerId, …)` rend une `Subscription` en MapLibre 5
 * (maplibre-gl.d.ts:12028) : c'est la seule prise sur un listener délégué déclaré
 * en flèche inline, `map.off()` exigeant la référence exacte de la fonction.
 */
function subscribeFuzzyHandlers(
  map: MapLibreMap,
  getSpotById: (id: string) => SpotMarker | undefined,
  onMarkerClick?: (spot: SpotMarker) => void,
): Subscription[] {
  return [
    map.on('mouseenter', FUZZY_FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer' }),
    map.on('mouseleave', FUZZY_FILL_LAYER, () => { map.getCanvas().style.cursor = '' }),
    // Lookup via getSpotById (ref) et pas une closure sur la liste : la liste
    // filtrée change après le mount, une closure servirait des spots périmés.
    map.on('click', FUZZY_FILL_LAYER, (e) => {
      const spotId = e.features?.[0]?.properties?.spotId as string | undefined
      const spot = spotId ? getSpotById(spotId) : undefined
      if (spot) onMarkerClick?.(spot)
    }),
  ]
}

// Pins HTML pour TOUS les spots (précis ET floutés). En Discovery les spots
// n'étaient rendus que comme disques pâles (opacity 0.2) → quasi invisibles au
// zoom France. Le pin est posé sur le centre du disque (geom_public) : il rend le
// spot visible et cliquable sans rien révéler de plus que le disque lui-même.
function createPins(
  map: MapLibreMap,
  maplibre: MaplibreModule,
  spots: SpotMarker[],
  onMarkerClick?: (spot: SpotMarker) => void,
  markerElemsOut?: Map<string, HTMLElement>,
): Marker[] {
  const markers: Marker[] = []
  for (const spot of spots) {
    const el = createPinElement(spot)
    markerElemsOut?.set(spot.id, el)
    // anchor center : la pastille DA v2 est un cercle posé sur le point.
    const marker = new maplibre.Marker({ element: el, anchor: 'center' })
      .setLngLat([spot.lng, spot.lat])
      .addTo(map)
    el.addEventListener('click', () => onMarkerClick?.(spot))
    markers.push(marker)
  }
  return markers
}

// ── Mode cluster : GeoJSON source + layers MapLibre ───────────────────────────

function buildClusterData(spots: SpotMarker[]) {
  return {
    type: 'FeatureCollection' as const,
    features: spots.map((s) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] as [number, number] },
      // ⟢ MERGE C2 : `source` ajouté aux properties (transparent pour C1/heatmap).
      properties: { spotId: s.id, isPrecise: s.isPrecise, name: s.name, quality: s.dayQuality ?? '', source: s.source },
    })),
  }
}

function addClusteredSpotsToMap(
  map: MapLibreMap,
  getSpotById: (id: string) => SpotMarker | undefined,
  onMarkerClick?: (spot: SpotMarker) => void,
): Subscription[] {
  // Source initialisée vide — peuplée par setData dans l'effet de resync.
  map.addSource(CLUSTER_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })

  // Bulles de cluster
  map.addLayer({
    id: CLUSTER_LAYER,
    type: 'circle',
    source: CLUSTER_SOURCE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['get', 'point_count'],
        TEAL_500,  // < 10
        10, TEAL_600,  // 10–29
        30, TEAL_700,  // >= 30
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        18,
        10, 22,
        30, 28,
      ],
      'circle-opacity': 0.92,
      'circle-stroke-width': 2.5,
      'circle-stroke-color': 'white',
    },
  })

  // Compteur dans les bulles
  map.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: 'symbol',
    source: CLUSTER_SOURCE,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: { 'text-color': 'white' },
  })

  // Points individuels hors cluster
  map.addLayer({
    id: UNCLUSTERED_LAYER,
    type: 'circle',
    source: CLUSTER_SOURCE,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': QUALITY_COLOR_EXPR,
      'circle-radius': 7,
      // ⟢ Sprint 41 / WS C — provenance par le CONTOUR (mode cluster) : curé =
      // anneau blanc épais (= « vérifié ») ; communautaire/importé = anneau plus
      // fin et navy (distinct, jamais blanc épais). Doublé du badge en mode HTML.
      'circle-stroke-width': ['match', ['get', 'source'], 'curated', 2.5, 1.5],
      'circle-stroke-color': ['match', ['get', 'source'], 'curated', '#ffffff', '#04141C'],
      // Spots précis = plein opaque ; floutés = légèrement transparents
      'circle-opacity': ['case', ['get', 'isPrecise'], 1, 0.7],
    },
  })

  return subscribeClusterHandlers(map, getSpotById, onMarkerClick)
}

/** Pendant de `subscribeFuzzyHandlers` pour le mode cluster. Même raison d'être. */
function subscribeClusterHandlers(
  map: MapLibreMap,
  getSpotById: (id: string) => SpotMarker | undefined,
  onMarkerClick?: (spot: SpotMarker) => void,
): Subscription[] {
  const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
  const clearPointer = () => { map.getCanvas().style.cursor = '' }

  return [
    map.on('mouseenter', CLUSTER_LAYER, setPointer),
    map.on('mouseleave', CLUSTER_LAYER, clearPointer),
    map.on('mouseenter', UNCLUSTERED_LAYER, setPointer),
    map.on('mouseleave', UNCLUSTERED_LAYER, clearPointer),

    // Clic sur cluster → zoom in
    map.on('click', CLUSTER_LAYER, async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] })
      if (!features.length) return
      const clusterId = features[0].properties?.cluster_id as number
      const source = map.getSource(CLUSTER_SOURCE) as GeoJSONSource
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId)
        const geom = features[0].geometry as { type: 'Point'; coordinates: [number, number] }
        map.easeTo({ center: geom.coordinates, zoom: zoom + 1 })
      } catch { /* cluster inexistant entre deux renders */ }
    }),

    // Clic sur point individuel → popup. Lookup via getSpotById (ref) : la liste
    // filtrée change après le mount, une closure servirait des spots périmés.
    map.on('click', UNCLUSTERED_LAYER, (e) => {
      const spotId = e.features?.[0]?.properties?.spotId as string | undefined
      const spot = spotId ? getSpotById(spotId) : undefined
      if (spot) onMarkerClick?.(spot)
    }),
  ]
}

// ── Prefetch de tuiles pour accélérer le premier affichage ───────────────────
// Envoie des fetch() low-priority sur la grille 3x3 autour du centre initial
// afin de peupler le cache HTTP avant que MapLibre ne réclame les mêmes URLs.
// MapTiler vector v3 → max-age=86400 → cache garanti. Silencieux (best-effort).
function prefetchTilesAround(
  center: [number, number],
  zoom: number,
  maptilerKey: string,
): void {
  const [lng, lat] = center
  const z = Math.floor(zoom)
  const x = Math.floor(((lng + 180) / 360) * 2 ** z)
  const y = Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
      2 ** z,
  )
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      fetch(
        `https://api.maptiler.com/tiles/v3/${z}/${x + dx}/${y + dy}.pbf?key=${maptilerKey}`,
        { priority: 'low' } as RequestInit,
      ).catch(() => {/* prefetch best-effort */})
    }
  }
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function MapView({
  spots,
  nearbySpotIds,
  initialCenter = FRANCE_CENTER,
  initialZoom = 6,
  initialBounds,
  onMarkerClick,
  onMapReady,
  className,
  interactive = true,
  cooperativeGestures = false,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  // Sprint 88, Bloc 5 : abonnements aux listeners DÉLÉGUÉS (ceux qui portent un
  // layerId). Ce sont les seuls qui empruntent le wrapper interne de MapLibre, lequel
  // fait `layerIds.filter((id) => this.getLayer(id))` — un appel qui déréférence
  // `map.style` SANS le tester (maplibre-gl 5.24.0, dist/maplibre-gl-dev.js:72132 et
  // :73161). Si le style a disparu, ça lève avant même que NOTRE handler ne tourne.
  const layerSubsRef = useRef<Subscription[]>([])
  // Comment re-poser ces listeners apres un `webglcontextrestored`. Rempli au
  // 'load', car c'est la qu'on sait si la carte tourne en mode cluster ou flou.
  const resubscribeRef = useRef<(() => Subscription[]) | null>(null)

  /**
   * Coupe tous les listeners délégués. Idempotent : appelable au démontage ET sur
   * perte de contexte WebGL, dans n'importe quel ordre.
   */
  const unsubscribeLayers = () => {
    for (const sub of layerSubsRef.current) {
      try {
        sub.unsubscribe()
      } catch {
        // La carte est peut-être déjà à moitié détruite. Se désabonner est un
        // nettoyage : il n'a pas le droit d'empêcher le reste du cleanup de tourner.
      }
    }
    layerSubsRef.current = []
  }


  const markerElemsRef = useRef<Map<string, HTMLElement>>(new Map())
  // Refs pour le resync des markers au changement de filtre (la liste `spots`
  // change après le mount) : module maplibre, markers HTML posés, liste courante
  // (lue par les handlers de clic), mode choisi au mount.
  const maplibreRef = useRef<MaplibreModule | null>(null)
  const markersRef = useRef<Marker[]>([])
  const spotsRef = useRef<SpotMarker[]>(spots)
  const useClusterRef = useRef(false)
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY

  // État d'erreur dérivé au montage : si la clé MapTiler manque, l'erreur est
  // connue dès le render (pas besoin de setState dans l'effect).
  const [error, setError] = useState<MapError | null>(
    maptilerKey ? null : 'missing-key',
  )
  // Skeleton tant que MapLibre + tuiles ne sont pas chargés (évite le flash blanc).
  const [loaded, setLoaded] = useState(false)
  // Incrémenté pour relancer l'init complète (reprise auto ou bouton « Réessayer »).
  const [retryToken, setRetryToken] = useState(0)
  const autoRetriesRef = useRef(0)

  // Première écriture du readout coords/zoom une fois le span monté
  // (le 'load' MapLibre part avant le re-render React → ref encore null).
  useEffect(() => {
    if (loaded && mapRef.current) writeReadout(mapRef.current, readoutRef.current)
  }, [loaded])

  useEffect(() => {
    // Protection contre le double-rendering de React Strict Mode
    if (mapRef.current || !containerRef.current) return

    if (!maptilerKey) {
      console.warn('[MapView] NEXT_PUBLIC_MAPTILER_KEY manquante — carte désactivée')
      // L'erreur 'missing-key' est déjà positionnée dans l'état initial.
      return
    }

    // Mode figé au mount : HTML markers sous le seuil, clustering au-dessus.
    useClusterRef.current = spots.length >= MAX_HTML_MARKERS

    // ── Préchauffage WebWorkers MapLibre (avant import dynamique) ──────────────
    // prewarm() initialise les workers partagés de parsing de tuiles dès maintenant,
    // avant que new Map() ne les réclame — réduit la latence du premier rendu.
    // Appelé AVANT setWorkerUrl/Count si besoin (requis par l'API).
    if (typeof window !== 'undefined') {
      import('maplibre-gl').then(({ prewarm }) => prewarm()).catch(() => {/* best-effort */})
    }

    // ── Préfetch des tuiles autour du centre initial (grille 3x3) ──────────────
    // Les tuiles MapTiler vector v3 ont max-age=86400 → elles seront dans le
    // cache HTTP quand MapLibre les demandera. Best-effort, silencieux.
    if (typeof window !== 'undefined' && maptilerKey) {
      prefetchTilesAround(initialCenter, initialZoom, maptilerKey)
    }

    let mounted = true
    let attribObserver: MutationObserver | null = null
    let revealTimer: ReturnType<typeof setTimeout> | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let styleFailTimer: ReturnType<typeof setTimeout> | undefined
    let cancelResize: (() => void) | undefined

    // Échec de chargement (style/tuiles/init WebGL) : 1 reprise auto silencieuse (le
    // skeleton reste affiché), puis fallback honnête avec bouton « Réessayer ». Jamais
    // d'écran cassé silencieux (audit 2026-07-02 §3.6 : embed home flaky).
    const failLoad = () => {
      if (!mounted) return
      if (autoRetriesRef.current < MAX_AUTO_RETRIES) {
        autoRetriesRef.current += 1
        retryTimer = setTimeout(() => {
          if (mounted) setRetryToken((t) => t + 1)
        }, AUTO_RETRY_DELAY_MS)
      } else {
        setError('init-error')
      }
    }

    // Les handlers de clic résolvent le spot dans la liste COURANTE (ref), pas
    // dans une closure : la liste filtrée change après le mount.
    const getSpotById = (id: string) => spotsRef.current.find((s) => s.id === id)

    // MapLibre rend les liens d'attribution (MapTiler, OpenStreetMap) via innerHTML
    // à partir du style, sans rel="noopener" → faille tabnabbing. On patche les
    // ancres après chaque (re)rendu de l'attribution.
    const patchAttributionLinks = () => {
      containerRef.current
        ?.querySelectorAll<HTMLAnchorElement>('.maplibregl-ctrl-attrib a[target="_blank"]')
        .forEach((a) => {
          a.rel = 'noopener noreferrer'
        })
    }

    const init = async () => {
      await import('maplibre-gl/dist/maplibre-gl.css')
      const maplibre = await import('maplibre-gl')

      if (!mounted || !containerRef.current) return

      // Style allégé sur mobile (basic-v2 = moins de POI/labels → moins de symbol
      // layers, moins de glyphs, rendu plus rapide). streets-v2 sur desktop.
      const isMobile =
        typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)
      const styleUrl = isMobile
        ? `https://api.maptiler.com/maps/basic-v2/style.json?key=${maptilerKey}`
        : `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`

      let map: MapLibreMap
      try {
        map = new maplibre.Map({
          container: containerRef.current,
          style: styleUrl,
          // Sprint 80, Bloc 3 : des bornes cadrent les deux façades quel que
          // soit le ratio du viewport ; le couple centre/zoom reste le défaut.
          ...(initialBounds
            ? {
                bounds: initialBounds,
                fitBoundsOptions: { padding: { top: 24, bottom: 168, left: 16, right: 16 } },
              }
            : { center: initialCenter, zoom: initialZoom }),
          attributionControl: {},
          interactive,
          cooperativeGestures,
          // Perf : supprime le fade-in des labels (300ms de repaints), réduit le
          // cache tuiles RAM, évite de rendre les copies du monde (inutile pour FR).
          fadeDuration: 0,
          maxTileCacheSize: 20,
          renderWorldCopies: false,
        })
      } catch {
        if (!mounted) return
        if (!supportsWebGL()) {
          // Vrai déficit navigateur (sondé) → message honnête, un retry n'y changera rien.
          console.warn('[MapView] WebGL non supporté : carte désactivée')
          setError('no-webgl')
        } else {
          // WebGL dispo mais init KO → échec transitoire (contexte GPU) : on retente.
          console.warn('[MapView] Échec init MapLibre (transitoire) : nouvelle tentative')
          failLoad()
        }
        return
      }

      mapRef.current = map
      maplibreRef.current = maplibre

      // ★ Sprint 88, Bloc 5 — perte de contexte WebGL.
      //
      // C'est le SEUL endroit de maplibre-gl 5.24.0 qui met `map.style` à `null`
      // (dist/maplibre-gl-dev.js:71346, handler `_contextLost`) ; `remove()`, lui,
      // fait `delete this.style`, donc `undefined`. Or les deux issues Sentry
      // parlent de « null/undefined », soit les deux chemins.
      //
      // Le cas `null` est le plus vicieux : la carte reste MONTÉE, ses écouteurs DOM
      // sont toujours actifs, et le prochain tap part droit dans le wrapper délégué
      // de MapLibre, qui appelle `getLayer()` sur un style nul. Fréquent sur mobile
      // (onglet en arrière-plan, pression GPU) — les deux issues sont bien sur
      // Chrome Mobile Android. On coupe donc les délégués dès la perte du contexte.
      map.on('webglcontextlost', unsubscribeLayers)
      // ⚠️ Et on SE REBRANCHE a la restauration, sinon on echangeait 3 evenements
      // Sentry contre une carte silencieusement inerte : MapLibre restaure bien le
      // style (`_contextRestored`, :71350), mais son evenement 'load' ne repart
      // JAMAIS (`_loaded` n'est jamais remis a false, :73845), donc le bloc qui
      // cree les couches et pose les listeners n'est pas rejoue. Sans cette ligne,
      // apres un incident GPU : plus de clic sur un spot, plus de zoom sur un
      // cluster, plus de curseur, jusqu'au remontage du composant.
      map.on('webglcontextrestored', () => {
        if (layerSubsRef.current.length > 0) return
        layerSubsRef.current = resubscribeRef.current?.() ?? []
      })

      // Erreur style (401 clé invalide, 403 domaine non autorisé, réseau, etc.).
      // Un tile 4xx isolé pré-load ne condamne pas la carte : on n'échoue que si le
      // style n'est TOUJOURS pas chargé après le délai de grâce.
      map.on('error', (e) => {
        console.error('[MapView] Erreur MapLibre:', e.error?.message ?? e)
        if (!mounted || map.isStyleLoaded() || styleFailTimer) return
        styleFailTimer = setTimeout(() => {
          styleFailTimer = undefined
          if (mounted && !map.isStyleLoaded()) failLoad()
        }, STYLE_FAIL_GRACE_MS)
      })

      map.on('move', () => writeReadout(map, readoutRef.current))

      // Si 'load' ne part jamais (fiches spot en prod, audit 2026-06-11 : skeleton
      // sombre permanent avec attribution visible), 'idle' — qui fire dès que la
      // carte a fini de rendre — lève le skeleton. Et à défaut des deux, le timer
      // révèle la carte plutôt que de la masquer indéfiniment. Dans les deux cas,
      // UNIQUEMENT si le style a réellement chargé : révéler sans fond = « markers
      // sans fond » silencieux (audit 2026-07-02 §3.6) → on passe par failLoad.
      map.once('idle', () => {
        if (!mounted || !map.isStyleLoaded()) return
        resizeIfSized(map, containerRef.current)
        setLoaded(true)
      })
      revealTimer = setTimeout(() => {
        if (!mounted) return
        if (map.isStyleLoaded()) {
          resizeIfSized(map, containerRef.current)
          setLoaded(true)
        } else {
          failLoad()
        }
      }, 10_000)

      map.on('load', () => {
        if (!mounted) return
        // Style chargé → annule un éventuel échec différé (erreur transitoire recouverte).
        if (styleFailTimer) {
          clearTimeout(styleFailTimer)
          styleFailTimer = undefined
        }
        // Le conteneur flex peut mesurer 0 px à l'instant de `new Map()` (init async,
        // layout pas encore résolu) → canvas noir tant qu'on n'interagit pas. Le resize
        // au seul 'load' était intermittent (T0.4 sprint 9.5) : 'load' peut partir avant
        // que le navigateur ait peint la taille flex finale. On reprogramme donc le
        // resize sur deux frames une fois la VRAIE taille du conteneur disponible (BUG-06).
        cancelResize?.()
        cancelResize = scheduleReliableResize(map, () => containerRef.current)
        setLoaded(true)
        onMapReady?.(map)

        // Patch initial + observation des réécritures d'attribution par MapLibre.
        patchAttributionLinks()
        const attribInner = containerRef.current?.querySelector('.maplibregl-ctrl-attrib-inner')
        if (attribInner) {
          attribObserver = new MutationObserver(patchAttributionLinks)
          attribObserver.observe(attribInner, { childList: true, subtree: true })
        }

        // Sources/layers créés vides — le peuplement (pins + setData) est fait
        // par l'effet de resync sur [spots, loaded], y compris au premier rendu.
        resubscribeRef.current = useClusterRef.current
          ? () => subscribeClusterHandlers(map, getSpotById, onMarkerClick)
          : () => subscribeFuzzyHandlers(map, getSpotById, onMarkerClick)
        layerSubsRef.current = useClusterRef.current
          ? addClusteredSpotsToMap(map, getSpotById, onMarkerClick)
          : addFuzzyLayers(map, getSpotById, onMarkerClick)
      })
    }

    // ResizeObserver : resize la carte chaque fois que le conteneur change de taille
    // (rotation, ouverture sidebar/sheet, paint flex tardif au mount). Ne resize que
    // si carte instanciée ET conteneur > 0 (resizeIfSized) — sinon no-op. On observe
    // APRÈS l'init pour que le 1er callback (qui fire à l'observe()) ait une chance de
    // voir mapRef.current assigné (l'observe() initial était auparavant un no-op garanti).
    const ro = new ResizeObserver(() => resizeIfSized(mapRef.current, containerRef.current))

    init()
      .then(() => {
        if (mounted && containerRef.current) ro.observe(containerRef.current)
      })
      .catch(() => {
        // Chunk maplibre-gl KO (réseau flaky, 503) → même chemin de reprise auto.
        failLoad()
      })

    return () => {
      mounted = false
      if (revealTimer) clearTimeout(revealTimer)
      if (retryTimer) clearTimeout(retryTimer)
      if (styleFailTimer) clearTimeout(styleFailTimer)
      cancelResize?.()
      ro.disconnect()
      attribObserver?.disconnect()
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      // eslint-disable-next-line react-hooks/exhaustive-deps -- ref Map stable (jamais réassignée), cleanup d'unmount : faux positif
      markerElemsRef.current.clear()
      // ★ Couper les listeners délégués AVANT `remove()`. Ce dernier fait
      // `handlers.destroy()` puis `delete this.style` : entre les deux, et surtout
      // pendant l'itération d'un `fire()` déclenché par le tap qui provoque la
      // navigation, un délégué encore branché tombe sur un style disparu
      // (issues JAVASCRIPT-NEXTJS-12 et -19, Chrome Mobile Android).
      unsubscribeLayers()
      mapRef.current?.remove()
      mapRef.current = null
      maplibreRef.current = null
    }
    // retryToken = relance volontaire de l'init complète (reprise auto / « Réessayer »).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken])

  // ── Resync markers + sources au changement de la liste (filtrée) ────────────
  // Sans cet effet, la carte gardait les spots du mount : appliquer un filtre
  // département ne retirait aucun marqueur (audit 2026-06-11 — « du 56 sous 29 »).
  useEffect(() => {
    spotsRef.current = spots
    const map = mapRef.current
    const maplibre = maplibreRef.current
    if (!loaded || !map || !maplibre) return

    // En mode HTML : cap à MAX_HTML_MARKERS. En mode cluster : tous les spots.
    const visibleSpots = useClusterRef.current ? spots : spots.slice(0, MAX_HTML_MARKERS)

    if (useClusterRef.current) {
      const src = map.getSource(CLUSTER_SOURCE) as GeoJSONSource | undefined
      src?.setData(buildClusterData(visibleSpots))
    } else {
      markersRef.current.forEach((m) => m.remove())
      markerElemsRef.current.clear()
      markersRef.current = createPins(map, maplibre, visibleSpots, onMarkerClick, markerElemsRef.current)
      const src = map.getSource(FUZZY_SOURCE) as GeoJSONSource | undefined
      src?.setData(buildFuzzyData(visibleSpots))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots, loaded])

  // ── Highlight des nearby spots ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const isClustered = spots.length >= MAX_HTML_MARKERS

    if (!nearbySpotIds || nearbySpotIds.size === 0) {
      // Réinitialise tous les marqueurs / layers à leur couleur de qualité
      markerElemsRef.current.forEach((el) => {
        el.style.opacity = '1'
        const ring = el.querySelector<HTMLElement>('.marker-nearby-ring')
        if (ring) ring.style.display = 'none'
        const dot = el.querySelector<HTMLElement>('.marker-dot')
        if (dot) dot.style.background = el.dataset.qcolor || TEAL_500
      })
      if (map.getLayer(FUZZY_FILL_LAYER)) {
        map.setPaintProperty(FUZZY_FILL_LAYER, 'fill-color', QUALITY_COLOR_EXPR)
        map.setPaintProperty(FUZZY_FILL_LAYER, 'fill-opacity', 0.2)
      }
      if (map.getLayer(FUZZY_LINE_LAYER)) {
        map.setPaintProperty(FUZZY_LINE_LAYER, 'line-color', QUALITY_COLOR_EXPR)
      }
      if (isClustered && map.getLayer(UNCLUSTERED_LAYER)) {
        map.setPaintProperty(UNCLUSTERED_LAYER, 'circle-color', QUALITY_COLOR_EXPR)
        map.setPaintProperty(UNCLUSTERED_LAYER, 'circle-opacity', [
          'case', ['get', 'isPrecise'], 1, 0.7,
        ])
      }
      return
    }

    const idsArr = [...nearbySpotIds]

    // Marqueurs HTML (spots précis, mode non-cluster)
    markerElemsRef.current.forEach((el, id) => {
      const isNearby = nearbySpotIds.has(id)
      el.style.opacity = isNearby ? '1' : '0.3'
      const ring = el.querySelector<HTMLElement>('.marker-nearby-ring')
      const dot = el.querySelector<HTMLElement>('.marker-dot')
      if (isNearby) {
        if (ring) ring.style.display = 'block'
        if (dot) dot.style.background = GOLD_500
      } else {
        if (ring) ring.style.display = 'none'
        if (dot) dot.style.background = el.dataset.qcolor || TEAL_500
      }
    })

    // Disques floutés (mode non-cluster)
    if (map.getLayer(FUZZY_FILL_LAYER)) {
      map.setPaintProperty(FUZZY_FILL_LAYER, 'fill-color', [
        'case',
        ['in', ['get', 'spotId'], ['literal', idsArr]],
        GOLD_500,
        QUALITY_COLOR_EXPR,
      ])
      map.setPaintProperty(FUZZY_FILL_LAYER, 'fill-opacity', [
        'case',
        ['in', ['get', 'spotId'], ['literal', idsArr]],
        0.4,
        0.08,
      ])
    }
    if (map.getLayer(FUZZY_LINE_LAYER)) {
      map.setPaintProperty(FUZZY_LINE_LAYER, 'line-color', [
        'case',
        ['in', ['get', 'spotId'], ['literal', idsArr]],
        GOLD_500,
        QUALITY_COLOR_EXPR,
      ])
    }

    // Points individuels (mode cluster)
    if (isClustered && map.getLayer(UNCLUSTERED_LAYER)) {
      map.setPaintProperty(UNCLUSTERED_LAYER, 'circle-color', [
        'case',
        ['in', ['get', 'spotId'], ['literal', idsArr]],
        GOLD_500,
        QUALITY_COLOR_EXPR,
      ])
      map.setPaintProperty(UNCLUSTERED_LAYER, 'circle-opacity', [
        'case',
        ['in', ['get', 'spotId'], ['literal', idsArr]],
        1,
        0.25,
      ])
    }
  }, [nearbySpotIds, spots.length])

  if (error === 'missing-key') {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className ?? ''}`}>
        <p className="text-sm text-gray-500">Carte indisponible</p>
      </div>
    )
  }

  if (error === 'no-webgl') {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className ?? ''}`}>
        <p className="text-sm text-gray-500">
          Ton navigateur ne supporte pas la carte interactive
        </p>
      </div>
    )
  }

  if (error === 'init-error') {
    // Fallback honnête + relance manuelle (audit 2026-07-02 §3.6) : on ne laisse
    // jamais un écran cassé silencieux. Le bouton relance l'init complète.
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className ?? ''}`}>
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <p className="text-sm text-gray-500">La carte n&apos;a pas répondu, réessaie.</p>
          <button
            type="button"
            onClick={() => {
              autoRetriesRef.current = 0
              setError(null)
              setLoaded(false)
              setRetryToken((t) => t + 1)
            }}
            className="min-h-11 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ position: 'relative', minHeight: '100%' }}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Carte des spots de pêche"
        style={{ position: 'absolute', inset: 0 }}
      />
      {/* Lecture coords + zoom — la donnée est l'ornement (DA v2) */}
      {loaded && interactive && (
        <span
          ref={readoutRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-2 z-10 hidden rounded-md bg-navy-950/80 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.05em] text-teal-300 sm:block"
        />
      )}
      {!loaded && <MapSkeleton />}
    </div>
  )
}

export type { MapViewProps }
