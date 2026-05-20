'use client'

import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'

type Props = {
  map: MapLibreMap | null
  position: { lat: number; lng: number } | null
}

function createUserLocationElement(): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText =
    'position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;pointer-events:none;'

  const ring = document.createElement('div')
  ring.className = 'user-location-ring'
  ring.setAttribute('aria-hidden', 'true')
  wrapper.appendChild(ring)

  const dot = document.createElement('div')
  dot.className = 'user-location-dot'
  wrapper.appendChild(dot)

  return wrapper
}

export default function UserLocationMarker({ map, position }: Props) {
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    if (!map || !position) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    const el = createUserLocationElement()

    // maplibre-gl déjà chargé par MapView — import() récupère le module en cache
    import('maplibre-gl').then(({ Marker: MapMarker }) => {
      markerRef.current?.remove()
      const marker = new MapMarker({ element: el, anchor: 'center' })
        .setLngLat([position.lng, position.lat])
        .addTo(map)
      markerRef.current = marker
    })

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
    }
  }, [map, position])

  return null
}
