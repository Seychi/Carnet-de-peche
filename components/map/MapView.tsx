'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker, GeoJSONSource, ExpressionSpecification } from 'maplibre-gl'
import { type SpotMarker, createFuzzyCircle, markerColorForQuality } from '@/lib/map/utils'

// ── Constantes ────────────────────────────────────────────────────────────────

// En-dessous de ce seuil → marqueurs HTML (meilleure UX popup).
// Au-dessus → clustering GeoJSON natif MapLibre (performance).
const MAX_HTML_MARKERS = 200

const TEAL_500 = '#14B8A6'
const TEAL_600 = '#0D9488'
const TEAL_700 = '#0F766E'
const AMBER_500 = '#F59E0B'
const GRAY_400 = '#9CA3AF'
const LIME_500 = '#84CC16'
const EMERALD_600 = '#059669'
const FRANCE_CENTER: [number, number] = [-2.5, 47.0]

// Couleur data-driven d'un feature GeoJSON selon sa propriété `quality`.
// Défaut (faible / inconnu / score absent) → gris neutre.
const QUALITY_COLOR_EXPR: ExpressionSpecification = [
  'match',
  ['get', 'quality'],
  'moyenne', AMBER_500,
  'bonne', LIME_500,
  'tres_bonne', TEAL_500,
  'exceptionnelle', EMERALD_600,
  GRAY_400,
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

// ── Mode HTML : marqueurs custom + disques floutés ────────────────────────────

function createPinElement(spot: SpotMarker): HTMLElement {
  // <button> = navigable au clavier (Tab + Entrée) + annoncé par les lecteurs d'écran
  const wrapper = document.createElement('button')
  wrapper.type = 'button'
  wrapper.style.cssText =
    'position: relative; cursor: pointer; width: 28px; height: 28px; background: none; border: none; padding: 0;'
  wrapper.title = spot.name
  wrapper.setAttribute('aria-label', `Spot : ${spot.name}`)

  // Couleur de base selon la qualité — mémorisée pour la restaurer après un
  // highlight nearby (cf. dataset.qcolor dans l'effet nearby).
  const color = markerColorForQuality(spot.currentQuality)
  wrapper.dataset.qcolor = color

  // Ring "exceptionnelle" : pulse permanent emerald (uniquement les meilleurs spots)
  if (spot.currentQuality === 'exceptionnelle') {
    const exc = document.createElement('div')
    exc.className = 'marker-exceptional-ring'
    wrapper.appendChild(exc)
  }

  // Anneau de pulse — activé via JS quand le spot est nearby
  const ring = document.createElement('div')
  ring.className = 'marker-nearby-ring'
  wrapper.appendChild(ring)

  const svgWrap = document.createElement('div')
  svgWrap.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="9" r="2.5" fill="white"/>
    </svg>
  `
  wrapper.appendChild(svgWrap)
  return wrapper
}

function addSpotsToMap(
  map: MapLibreMap,
  maplibre: MaplibreModule,
  spots: SpotMarker[],
  onMarkerClick?: (spot: SpotMarker) => void,
  markerElemsOut?: Map<string, HTMLElement>,
): Marker[] {
  const markers: Marker[] = []
  const preciseSpots = spots.filter((s) => s.isPrecise)
  const fuzzySpots = spots.filter((s) => !s.isPrecise)

  // Marqueurs HTML custom pour les spots à coordonnées précises (abonnés)
  for (const spot of preciseSpots) {
    const el = createPinElement(spot)
    markerElemsOut?.set(spot.id, el)
    const marker = new maplibre.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([spot.lng, spot.lat])
      .addTo(map)
    el.addEventListener('click', () => onMarkerClick?.(spot))
    markers.push(marker)
  }

  // Disques floutés (1 km) pour les spots sans abonnement
  if (fuzzySpots.length > 0) {
    const features = fuzzySpots.map((s) => createFuzzyCircle(s, 1))
    map.addSource(FUZZY_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features },
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
    map.on('click', FUZZY_FILL_LAYER, (e) => {
      const spotId = e.features?.[0]?.properties?.spotId as string | undefined
      const spot = fuzzySpots.find((s) => s.id === spotId)
      if (spot) onMarkerClick?.(spot)
    })
  }

  return markers
}

// ── Mode cluster : GeoJSON source + layers MapLibre ───────────────────────────

function addClusteredSpotsToMap(
  map: MapLibreMap,
  spots: SpotMarker[],
  onMarkerClick?: (spot: SpotMarker) => void,
): void {
  const features = spots.map((s) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] as [number, number] },
    properties: { spotId: s.id, isPrecise: s.isPrecise, name: s.name, quality: s.currentQuality ?? '' },
  }))

  map.addSource(CLUSTER_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
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

  // Clic sur point individuel → popup
  map.on('click', UNCLUSTERED_LAYER, (e) => {
    const spotId = e.features?.[0]?.properties?.spotId as string | undefined
    const spot = spots.find((s) => s.id === spotId)
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
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerElemsRef = useRef<Map<string, HTMLElement>>(new Map())
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY

  // État d'erreur dérivé au montage : si la clé MapTiler manque, l'erreur est
  // connue dès le render (pas besoin de setState dans l'effect).
  const [error, setError] = useState<MapError | null>(
    maptilerKey ? null : 'missing-key',
  )

  useEffect(() => {
    // Protection contre le double-rendering de React Strict Mode
    if (mapRef.current || !containerRef.current) return

    if (!maptilerKey) {
      console.warn('[MapView] NEXT_PUBLIC_MAPTILER_KEY manquante — carte désactivée')
      // L'erreur 'missing-key' est déjà positionnée dans l'état initial.
      return
    }

    const useCluster = spots.length >= MAX_HTML_MARKERS
    // En mode HTML : cap à MAX_HTML_MARKERS. En mode cluster : tous les spots.
    const visibleSpots = useCluster ? spots : spots.slice(0, MAX_HTML_MARKERS)

    let markers: Marker[] = []
    let mounted = true

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

      // Erreur style (401 clé invalide, 403 domaine non autorisé, réseau, etc.)
      map.on('error', (e) => {
        console.error('[MapView] Erreur MapLibre:', e.error?.message ?? e)
        if (mounted && !map.isStyleLoaded()) setError('init-error')
      })

      map.on('load', () => {
        if (!mounted) return
        onMapReady?.(map)
        if (useCluster) {
          addClusteredSpotsToMap(map, visibleSpots, onMarkerClick)
        } else {
          markers = addSpotsToMap(map, maplibre, visibleSpots, onMarkerClick, markerElemsRef.current)
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
      ro.disconnect()
      markers.forEach((m) => m.remove())
      markerElemsRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        const path = el.querySelector('path')
        if (path) path.setAttribute('fill', el.dataset.qcolor || TEAL_500)
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
      const path = el.querySelector('path')
      if (isNearby) {
        if (ring) ring.style.display = 'block'
        if (path) path.setAttribute('fill', AMBER_500)
      } else {
        if (ring) ring.style.display = 'none'
        if (path) path.setAttribute('fill', el.dataset.qcolor || TEAL_500)
      }
    })

    // Disques floutés (mode non-cluster)
    if (map.getLayer(FUZZY_FILL_LAYER)) {
      map.setPaintProperty(FUZZY_FILL_LAYER, 'fill-color', [
        'case',
        ['in', ['get', 'spotId'], ['literal', idsArr]],
        AMBER_500,
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
        AMBER_500,
        QUALITY_COLOR_EXPR,
      ])
    }

    // Points individuels (mode cluster)
    if (isClustered && map.getLayer(UNCLUSTERED_LAYER)) {
      map.setPaintProperty(UNCLUSTERED_LAYER, 'circle-color', [
        'case',
        ['in', ['get', 'spotId'], ['literal', idsArr]],
        AMBER_500,
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

  return <div ref={containerRef} className={className} />
}

export type { MapViewProps }
