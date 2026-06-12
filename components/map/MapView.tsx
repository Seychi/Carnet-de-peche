'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker, GeoJSONSource, ExpressionSpecification } from 'maplibre-gl'
import { type SpotMarker, createFuzzyCircle, markerColorForQuality } from '@/lib/map/utils'

// ── Constantes ────────────────────────────────────────────────────────────────

// En-dessous de ce seuil → marqueurs HTML (meilleure UX popup).
// Au-dessus → clustering GeoJSON natif MapLibre (performance).
const MAX_HTML_MARKERS = 200

const TEAL_500 = '#14B8A6'
const TEAL_600 = '#0E9488'
const TEAL_700 = '#0F766E'
const GOLD_500 = '#D9A53C'
const INK_400 = '#7E8C95'
const INK_300 = '#B7C2C9'
const FRANCE_CENTER: [number, number] = [-2.5, 47.0]

// Couleur data-driven d'un feature GeoJSON selon sa propriété `quality`.
// Sémantique DA v2 (haut teal · milieu gold · bas ink) — alignée sur
// QUALITY_MARKER_COLORS de lib/map/utils.
const QUALITY_COLOR_EXPR: ExpressionSpecification = [
  'match',
  ['get', 'quality'],
  'faible', INK_400,
  'moyenne', GOLD_500,
  'bonne', GOLD_500,
  'tres_bonne', TEAL_600,
  'exceptionnelle', TEAL_500,
  INK_300,
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
  onMarkerClick?: (spot: SpotMarker) => void
  onMapReady?: (map: MapLibreMap) => void
  className?: string
  interactive?: boolean
}

type MapError = 'missing-key' | 'no-webgl' | 'init-error'
type MaplibreModule = typeof import('maplibre-gl')

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
  wrapper.title = spot.name
  wrapper.setAttribute('aria-label', `Spot : ${spot.name}`)

  // Couleur de base selon la qualité — mémorisée pour la restaurer après un
  // highlight nearby (cf. dataset.qcolor dans l'effet nearby).
  const color = markerColorForQuality(spot.currentQuality)
  wrapper.dataset.qcolor = color

  // Ring "exceptionnelle" : pulse permanent (uniquement les meilleurs spots)
  if (spot.currentQuality === 'exceptionnelle') {
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
): void {
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
  map.on('mouseenter', FUZZY_FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', FUZZY_FILL_LAYER, () => { map.getCanvas().style.cursor = '' })
  // Lookup via getSpotById (ref) et pas une closure sur la liste : la liste
  // filtrée change après le mount, une closure servirait des spots périmés.
  map.on('click', FUZZY_FILL_LAYER, (e) => {
    const spotId = e.features?.[0]?.properties?.spotId as string | undefined
    const spot = spotId ? getSpotById(spotId) : undefined
    if (spot) onMarkerClick?.(spot)
  })
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
      properties: { spotId: s.id, isPrecise: s.isPrecise, name: s.name, quality: s.currentQuality ?? '' },
    })),
  }
}

function addClusteredSpotsToMap(
  map: MapLibreMap,
  getSpotById: (id: string) => SpotMarker | undefined,
  onMarkerClick?: (spot: SpotMarker) => void,
): void {
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
      'circle-stroke-width': 2,
      'circle-stroke-color': 'white',
      // Spots précis = plein opaque ; floutés = légèrement transparents
      'circle-opacity': ['case', ['get', 'isPrecise'], 1, 0.7],
    },
  })

  const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
  const clearPointer = () => { map.getCanvas().style.cursor = '' }

  map.on('mouseenter', CLUSTER_LAYER, setPointer)
  map.on('mouseleave', CLUSTER_LAYER, clearPointer)
  map.on('mouseenter', UNCLUSTERED_LAYER, setPointer)
  map.on('mouseleave', UNCLUSTERED_LAYER, clearPointer)

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
  })

  // Clic sur point individuel → popup. Lookup via getSpotById (ref) : la liste
  // filtrée change après le mount, une closure servirait des spots périmés.
  map.on('click', UNCLUSTERED_LAYER, (e) => {
    const spotId = e.features?.[0]?.properties?.spotId as string | undefined
    const spot = spotId ? getSpotById(spotId) : undefined
    if (spot) onMarkerClick?.(spot)
  })
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function MapView({
  spots,
  nearbySpotIds,
  initialCenter = FRANCE_CENTER,
  initialZoom = 6,
  onMarkerClick,
  onMapReady,
  className,
  interactive = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
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

    let mounted = true
    let attribObserver: MutationObserver | null = null
    let revealTimer: ReturnType<typeof setTimeout> | undefined

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

      let map: MapLibreMap
      try {
        map = new maplibre.Map({
          container: containerRef.current,
          style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`,
          center: initialCenter,
          zoom: initialZoom,
          attributionControl: {},
          interactive,
        })
      } catch {
        console.warn('[MapView] WebGL non supporté ou erreur MapLibre init')
        if (mounted) setError('no-webgl')
        return
      }

      mapRef.current = map
      maplibreRef.current = maplibre

      // Erreur style (401 clé invalide, 403 domaine non autorisé, réseau, etc.)
      map.on('error', (e) => {
        console.error('[MapView] Erreur MapLibre:', e.error?.message ?? e)
        if (mounted && !map.isStyleLoaded()) setError('init-error')
      })

      map.on('move', () => writeReadout(map, readoutRef.current))

      // Si 'load' ne part jamais (fiches spot en prod, audit 2026-06-11 : skeleton
      // sombre permanent avec attribution visible), 'idle' — qui fire dès que la
      // carte a fini de rendre — lève le skeleton. Et à défaut des deux, le timer
      // révèle la carte plutôt que de la masquer indéfiniment.
      map.once('idle', () => {
        if (!mounted) return
        map.resize()
        setLoaded(true)
      })
      revealTimer = setTimeout(() => {
        if (!mounted) return
        map.resize()
        setLoaded(true)
      }, 10_000)

      map.on('load', () => {
        if (!mounted) return
        // Le conteneur flex peut mesurer 0 px à l'instant de `new Map()` (init async,
        // layout pas encore résolu) → canvas uniforme tant qu'on n'interagit pas. Un
        // resize explicite au 'load' force MapLibre à relire les dimensions réelles.
        map.resize()
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
        if (useClusterRef.current) {
          addClusteredSpotsToMap(map, getSpotById, onMarkerClick)
        } else {
          addFuzzyLayers(map, getSpotById, onMarkerClick)
        }
      })
    }

    init().catch(() => {
      if (mounted) setError('init-error')
    })

    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(containerRef.current)

    return () => {
      mounted = false
      if (revealTimer) clearTimeout(revealTimer)
      ro.disconnect()
      attribObserver?.disconnect()
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      markerElemsRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
      maplibreRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className ?? ''}`}>
        <p className="text-sm text-gray-500">
          La carte n&apos;a pas pu se charger — vérifie ta connexion ou réessaie.
        </p>
      </div>
    )
  }

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Lecture coords + zoom — la donnée est l'ornement (DA v2) */}
      {loaded && interactive && (
        <span
          ref={readoutRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-2 z-10 hidden rounded-md bg-navy-950/80 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.05em] text-teal-300 sm:block"
        />
      )}
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 motion-safe:animate-pulse pointer-events-none"
          style={{ background: 'linear-gradient(180deg, #0A2F3D 0%, #103E50 55%, #14B8A6 170%)' }}
        />
      )}
    </div>
  )
}

export type { MapViewProps }
