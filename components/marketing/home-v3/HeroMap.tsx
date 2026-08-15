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
  // Lus au moment du `load`, jamais en dépendance d'effet (cf. plus bas).
  const spotsRef = useRef(spots)
  spotsRef.current = spots
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
          // ⚠️ SPRINT 80, Bloc 4 — cadrage mesuré le 15/08 : avec `pitch: 40` et
          // `zoom: 7.4`, la moitié haute de l'écran regarde très loin « devant »
          // la caméra, et `bearing: -18` oriente ce devant vers le nord-nord-ouest.
          // Depuis un spot breton, ça tombe sur les Cornouailles : la home d'un
          // site de pêche française affichait « Truro » puis « Exeter » en fond.
          // Moins d'inclinaison et un cran de zoom en plus gardent le cadre sur la
          // façade française, quelle que soit la région de `hero.position`.
          zoom: 8.2,
          pitch: 22,
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
            features: spotsRef.current.map((s) => ({
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
    // ⚠️ SPRINT 80, Bloc 4 — `spots` est un TABLEAU : il change d'identité à
    // chaque rendu du parent, même à contenu égal. L'effet se rejouait donc, et
    // son nettoyage appelait `map.remove()` PENDANT que le style, le sprite et
    // les tuiles étaient en vol. C'est la signature exacte des trois
    // `net::ERR_ABORTED` mesurés le 15/08 sur `api.maptiler.com`. On ne dépend
    // plus que de primitives stables ; les spots sont lus dans une ref, donc
    // toujours à jour au moment du `load` sans provoquer de remontage.
  }, [center.lat, center.lng, maptilerKey])

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
