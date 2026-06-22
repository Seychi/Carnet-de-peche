'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM } from '@/lib/map/utils'

// Sélecteur de position autonome (sa PROPRE instance MapLibre) — ne touche pas
// components/map/MapView.tsx (fichier partagé avec la session C1). On clique /
// glisse un marqueur pour placer le spot proposé. L'attribution OSM/MapTiler du
// fond de carte est affichée par le contrôle d'attribution MapLibre (ODbL).

type LatLng = { lat: number; lng: number }

type Props = {
  value: LatLng | null
  onChange: (lat: number, lng: number) => void
  /** Centre initial si aucun point n'est encore choisi (ex. dépt du pêcheur). */
  initialCenter?: [number, number]
}

export default function SpotLocationPicker({ value, onChange, initialCenter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  // onChange dans une ref → l'effet de montage ne dépend pas de son identité.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Montage unique de la carte.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY
    if (!key) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`,
      center: value ? [value.lng, value.lat] : (initialCenter ?? COASTAL_DEFAULT_CENTER),
      zoom: value ? 13 : COASTAL_DEFAULT_ZOOM,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const marker = new maplibregl.Marker({ color: '#E5604F', draggable: true })
    if (value) marker.setLngLat([value.lng, value.lat]).addTo(map)

    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat()
      onChangeRef.current(lat, lng)
    })
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat).addTo(map)
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng)
    })
    map.on('load', () => map.resize())

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Synchronise le marqueur si la valeur change de l'extérieur (ex. géoloc).
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker || !value) return
    marker.setLngLat([value.lng, value.lat]).addTo(map)
  }, [value])

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[300px] w-full overflow-hidden rounded-[14px] border border-sand-200"
        aria-label="Carte pour placer le spot"
      />
      <p className="mt-1.5 text-[12px] text-ink-400">
        Touche la carte pour poser le point, ou glisse le marqueur pour l’ajuster.
      </p>
    </div>
  )
}
