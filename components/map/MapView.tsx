'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { type SpotMarker, createFuzzyCircle } from '@/lib/map/utils'

const MAX_MARKERS = 200
const TEAL_500 = '#14B8A6'
const TEAL_600 = '#0D9488'
const FRANCE_CENTER: [number, number] = [-2.5, 47.0]
const FUZZY_SOURCE = 'fuzzy-spots'
const FUZZY_FILL_LAYER = 'fuzzy-fill'
const FUZZY_LINE_LAYER = 'fuzzy-line'

type MapViewProps = {
  spots: SpotMarker[]
  initialCenter?: [number, number]
  initialZoom?: number
  onMarkerClick?: (spot: SpotMarker) => void
  onMapReady?: (map: MapLibreMap) => void
  className?: string
  interactive?: boolean
}

type MapError = 'missing-key' | 'no-webgl' | 'init-error'
type MaplibreModule = typeof import('maplibre-gl')

function createPinElement(spot: SpotMarker): HTMLElement {
  const el = document.createElement('div')
  el.style.cursor = 'pointer'
  el.title = spot.name
  el.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            fill="${TEAL_500}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="9" r="2.5" fill="white"/>
    </svg>
  `
  return el
}

function addSpotsToMap(
  map: MapLibreMap,
  maplibre: MaplibreModule,
  spots: SpotMarker[],
  onMarkerClick?: (spot: SpotMarker) => void
): Marker[] {
  const markers: Marker[] = []
  const preciseSpots = spots.filter((s) => s.isPrecise)
  const fuzzySpots = spots.filter((s) => !s.isPrecise)

  // Markers HTML custom pour les spots à coordonnées précises (abonnés)
  for (const spot of preciseSpots) {
    const el = createPinElement(spot)
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
      paint: { 'fill-color': TEAL_500, 'fill-opacity': 0.2 },
    })
    map.addLayer({
      id: FUZZY_LINE_LAYER,
      type: 'line',
      source: FUZZY_SOURCE,
      paint: { 'line-color': TEAL_600, 'line-width': 1.5 },
    })

    map.on('mouseenter', FUZZY_FILL_LAYER, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', FUZZY_FILL_LAYER, () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('click', FUZZY_FILL_LAYER, (e) => {
      const spotId = e.features?.[0]?.properties?.spotId as string | undefined
      const spot = fuzzySpots.find((s) => s.id === spotId)
      if (spot) onMarkerClick?.(spot)
    })
  }

  return markers
}

export default function MapView({
  spots,
  initialCenter = FRANCE_CENTER,
  initialZoom = 6,
  onMarkerClick,
  onMapReady,
  className,
  interactive = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [error, setError] = useState<MapError | null>(null)

  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY

  useEffect(() => {
    // Protection contre le double-rendering de React Strict Mode
    if (mapRef.current || !containerRef.current) return

    if (!maptilerKey) {
      console.warn('[MapView] NEXT_PUBLIC_MAPTILER_KEY manquante — carte désactivée')
      setError('missing-key')
      return
    }

    const visibleSpots = spots.slice(0, MAX_MARKERS)
    let markers: Marker[] = []
    let mounted = true

    const init = async () => {
      // Lazy-load du CSS MapLibre pour ne pas bloquer le bundle initial
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

      map.on('load', () => {
        if (!mounted) return
        onMapReady?.(map)
        markers = addSpotsToMap(map, maplibre, visibleSpots, onMarkerClick)
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
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error === 'missing-key') {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className ?? ''}`}>
        <p className="text-sm text-gray-500">Carte indisponible</p>
      </div>
    )
  }

  if (error === 'no-webgl' || error === 'init-error') {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className ?? ''}`}>
        <p className="text-sm text-gray-500">
          Ton navigateur ne supporte pas la carte interactive
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}

export type { MapViewProps }
