'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { QualityLevel } from '@/lib/solunar/types'

const HeroMap = dynamic(() => import('./HeroMap').then((m) => m.HeroMap), { ssr: false })

type MapSpot = { id: string; name: string; lat: number; lng: number; quality: QualityLevel | null }

/**
 * Fond décoratif de la section Tarifs (§04) : vraie carte MapLibre MÉDITERRANÉE
 * (spots floutés, dérive lente, mer WebGL) derrière les cartes de prix. Lazy à l'entrée
 * en viewport (MapLibre hors First Load JS + pas de tuiles chargées tant qu'on n'a pas
 * scrollé en bas). Un voile navy garde les tarifs (texte blanc) parfaitement lisibles.
 */
export function MedMapBackdrop({ center, spots }: { center: { lat: number; lng: number }; spots: MapSpot[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      {inView && <HeroMap center={center} spots={spots} />}
      {/* Voile : tarifs lisibles par-dessus la carte (plus dense en bas, sous les cartes). */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/78 to-navy-950/88" />
    </div>
  )
}
