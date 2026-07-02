'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { SpotMarker } from '@/lib/map/utils'
import type { MapViewProps } from '@/components/map/MapView'
import { COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM } from '@/lib/map/utils'
import { SPOTS_CURATED_LABEL } from '@/lib/marketing/stats'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function MapSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-ink-100">
      <div className="size-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
    </div>
  )
}

// Import de chunk résilient (audit 2026-07-02 §3.6 : embed home flaky). Un fetch de
// chunk peut échouer transitoirement (réseau, 503 WAF) → 1 reprise silencieuse après
// une courte attente avant de laisser l'échec remonter.
function retryImport<T>(load: () => Promise<T>): Promise<T> {
  return load().catch(
    () =>
      new Promise<T>((resolve, reject) => {
        setTimeout(() => load().then(resolve, reject), 1_200)
      }),
  )
}

// Dernier recours si le chunk MapView ne charge vraiment pas (2 tentatives KO) :
// fallback honnête + bouton réessayer. Jamais de trou silencieux ni de crash de la home.
function MapLoadFallback({ className }: MapViewProps) {
  return (
    <div className={cn('grid place-items-center bg-ink-100', className)}>
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <p className="text-sm text-ink-600">La carte n&apos;a pas répondu, réessaie.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}

// MapLibre (~400 KB) + le popup : chargés en lazy, et SEULEMENT à l'entrée de la
// section dans le viewport (pas au mount) → hors First Load JS de la home.
const MapView = dynamic(
  () =>
    retryImport(() => import('@/components/map/MapView')).catch(() => ({
      default: MapLoadFallback,
    })),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
)
const SpotPopup = dynamic(() => retryImport(() => import('@/components/map/SpotPopup')), {
  ssr: false,
})

/**
 * Section 02 — carte explorable RÉELLE (sprint 34, WS-4). Vrais spots publics
 * (floutés anon), markers de score réel, clic → vrai SpotPopup (vue anonyme : coords
 * floutées + gating « réservé aux abonnés »). Interactive (pan/zoom) mais SANS dérive
 * auto → les markers HTML de MapView ne tremblent pas. Lazy à l'entrée en viewport.
 */
export function HomeMapSection({ spots }: { spots: SpotMarker[] }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [activeSpot, setActiveSpot] = useState<SpotMarker | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { rootMargin: '250px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="carte" className="scroll-mt-20 py-24 md:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="max-w-[680px]">
          <p className="font-mono text-[13px] font-medium uppercase tracking-[0.12em] text-teal-700">
            02 — La carte
          </p>
          <h2 className="mt-3 font-display text-[clamp(28px,4.6vw,52px)] font-semibold leading-[1.08] text-navy-900">
            Une carte marine, pas un plan de ville.
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-600">
            {SPOTS_CURATED_LABEL} et vérifiés. Coords floutées en gratuit, précises pour les abonnés.
            Scoring 0-100, bathymétrie, courbes de marée. Tu vois le vrai produit, pas une
            promesse.
          </p>
        </div>

        <div
          ref={boxRef}
          className="relative mt-10 h-[440px] overflow-hidden rounded-[20px] border border-sand-200 shadow-[0_30px_70px_-30px_rgba(4,20,28,.4)] sm:h-[500px]"
        >
          {inView ? (
            <MapView
              spots={spots}
              interactive
              cooperativeGestures
              initialCenter={COASTAL_DEFAULT_CENTER}
              initialZoom={COASTAL_DEFAULT_ZOOM}
              className="absolute inset-0"
              onMarkerClick={setActiveSpot}
            />
          ) : (
            <MapSkeleton />
          )}
          {activeSpot && (
            <SpotPopup spot={activeSpot} onClose={() => setActiveSpot(null)} userTier="anonymous" />
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Link href="/carte" className={cn(buttonVariants({ variant: 'navy', size: 'cta' }))}>
            Explorer la carte complète
            <ArrowRight size={16} strokeWidth={1.7} />
          </Link>
        </div>
      </div>
    </section>
  )
}
