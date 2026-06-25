'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { markerColorForQuality } from '@/lib/map/utils'
import type { QualityLevel } from '@/lib/solunar/types'

export type HeroMapSpot = {
  id: string
  name: string
  lat: number
  lng: number
  quality: QualityLevel | null
}

/**
 * Carte MapLibre de FOND du hero (sprint 34, WS-3.3) — décorative, NON interactive,
 * style sombre, centrée sur la façade. Montée APRÈS l'idle (LCP : le texte + l'instrument
 * peignent d'abord), avec fondu. Dérive lente de la caméra (bearing), EN PAUSE onglet
 * caché et OFF en reduced-motion. Markers = vrais spots (centroïdes `geom_public` floutés,
 * jamais de GPS précis). `antialias:true` au constructeur prépare la mer WebGL (WS-3.4).
 */
export function HeroMap({
  center,
  spots,
}: {
  center: { lat: number; lng: number }
  spots: HeroMapSpot[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY

  useEffect(() => {
    if (mapRef.current || !containerRef.current || !maptilerKey) return
    const container = containerRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cancelled = false
    let raf = 0
    const markers: Marker[] = []
    let onVisibility: (() => void) | null = null

    const idle: (cb: () => void) => void =
      'requestIdleCallback' in window
        ? (cb) =>
            (
              window as unknown as {
                requestIdleCallback: (c: () => void, o?: { timeout: number }) => number
              }
            ).requestIdleCallback(cb, { timeout: 1500 })
        : (cb) => void window.setTimeout(cb, 400)

    idle(async () => {
      if (cancelled) return
      await import('maplibre-gl/dist/maplibre-gl.css')
      const maplibre = await import('maplibre-gl')
      if (cancelled) return

      let map: MapLibreMap
      try {
        map = new maplibre.Map({
          container,
          style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${maptilerKey}`,
          center: [center.lng, center.lat],
          zoom: 8.3,
          pitch: 40,
          bearing: -18,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
          renderWorldCopies: false,
          canvasContextAttributes: { antialias: true },
        })
      } catch {
        return
      }
      mapRef.current = map

      map.on('load', () => {
        if (cancelled) return
        for (const s of spots) {
          const color = markerColorForQuality(s.quality)
          const el = document.createElement('div')
          el.style.cssText =
            `width:13px;height:13px;border-radius:50%;background:${color};` +
            `border:1.5px solid rgba(255,255,255,.75);` +
            `box-shadow:0 0 0 4px ${color}26, 0 0 16px 4px ${color}59;`
          markers.push(
            new maplibre.Marker({ element: el, anchor: 'center' })
              .setLngLat([s.lng, s.lat])
              .addTo(map),
          )
        }
        setReady(true)

        // Dérive lente du bearing (≈0,6°/s) — premium, non distrayant. OFF reduced-motion,
        // en pause onglet caché (drain GPU).
        if (!reduce) {
          const loop = () => {
            if (cancelled) return
            map.setBearing(map.getBearing() + 0.01)
            raf = requestAnimationFrame(loop)
          }
          onVisibility = () => {
            cancelAnimationFrame(raf)
            if (!document.hidden && !cancelled) raf = requestAnimationFrame(loop)
          }
          document.addEventListener('visibilitychange', onVisibility)
          raf = requestAnimationFrame(loop)
        }
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
      markers.forEach((m) => m.remove())
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [center.lat, center.lng, maptilerKey, spots])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
        ready ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}
