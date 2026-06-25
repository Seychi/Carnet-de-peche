'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { markerColorForQuality } from '@/lib/map/utils'
import type { QualityLevel } from '@/lib/solunar/types'
import { motionReduced } from '@/components/marketing/motion/config'
import { makeSeaLayer } from './seaLayer'

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
    const reduce = motionReduced()

    let cancelled = false
    let raf = 0
    let onVisibility: (() => void) | null = null

    const idle: (cb: () => void) => void =
      'requestIdleCallback' in window
        ? (cb) =>
            (
              window as unknown as {
                requestIdleCallback: (c: () => void, o?: { timeout: number }) => number
              }
            ).requestIdleCallback(cb, { timeout: 500 })
        : (cb) => void window.setTimeout(cb, 200)

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
          zoom: 7.4, // plus large → davantage de spots de la façade à l'écran (hero « rempli »)
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

        // Mer WebGL (WS-3.4) — custom layer GLSL dans le MÊME contexte GL, SOUS les
        // spots. Hors reduced-motion.
        if (!reduce) {
          try {
            map.addLayer(makeSeaLayer(maplibre, { lat: center.lat, lng: center.lng }))
          } catch {
            /* la mer n'est pas critique : en cas d'échec shader, la carte reste */
          }
        }

        // Spots = couche CIRCLE (canvas/GPU), PAS des marqueurs HTML : positionnés au
        // sous-pixel par le moteur → AUCUN tremblement pendant la dérive (les marqueurs
        // HTML, repositionnés en `transform` à chaque frame, vibraient). Le mouvement
        // de la caméra est conservé, seul le rendu des points change.
        map.addSource('hero-spots', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: spots.map((s) => ({
              type: 'Feature' as const,
              geometry: {
                type: 'Point' as const,
                coordinates: [s.lng, s.lat] as [number, number],
              },
              properties: { color: markerColorForQuality(s.quality) },
            })),
          },
        })
        map.addLayer({
          id: 'hero-spots-glow',
          type: 'circle',
          source: 'hero-spots',
          paint: {
            'circle-radius': 18,
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.45,
            'circle-blur': 1,
          },
        })
        map.addLayer({
          id: 'hero-spots-dot',
          type: 'circle',
          source: 'hero-spots',
          paint: {
            'circle-radius': 5,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.8)',
          },
        })

        setReady(true)

        // Dérive du bearing ~4°/s, TIME-BASED (indépendante du refresh rate) → clairement
        // perceptible. Démarre dès le montage de la carte. OFF reduced-motion, en pause
        // onglet caché (drain GPU).
        if (!reduce) {
          const DEG_PER_SEC = 5
          let last = 0
          const loop = (now: number) => {
            if (cancelled) return
            if (!last) last = now
            const dt = Math.min((now - last) / 1000, 0.05) // clamp frame longue / retour d'onglet
            last = now
            map.setBearing(map.getBearing() + DEG_PER_SEC * dt)
            raf = requestAnimationFrame(loop)
          }
          onVisibility = () => {
            cancelAnimationFrame(raf)
            last = 0 // reset → pas de saut au retour d'onglet
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
