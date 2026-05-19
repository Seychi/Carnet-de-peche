'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, MapPin, Navigation, Lock, Fish } from 'lucide-react'
import type { SpotMarker } from '@/lib/map/utils'
import type { UserTier } from '@/lib/auth/tier'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'

type SpotPopupProps = {
  spot: SpotMarker
  onClose: () => void
  userTier?: UserTier
}

const MAX_BADGES = 2

const STRUCTURE_ICONS: Record<string, string> = {
  pointe_rocheuse: '🪨',
  plage: '🏖️',
  digue: '🧱',
  estuaire: '🌊',
  cale: '⚓',
  passe: '🌊',
  cassure: '🪨',
}

function BadgeList({
  items,
  labels,
  colorClass,
}: {
  items: string[]
  labels: Record<string, string>
  colorClass: string
}) {
  const visible = items.slice(0, MAX_BADGES)
  const overflow = items.length - MAX_BADGES
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <span key={item} className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
          {labels[item] ?? item}
        </span>
      ))}
      {overflow > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} opacity-60`}>
          +{overflow}
        </span>
      )}
    </div>
  )
}

function DifficultyStars({ difficulty }: { difficulty: number }) {
  if (!difficulty || difficulty < 1) return null
  return (
    <div className="flex items-center gap-0.5" aria-label={`Difficulté ${difficulty} sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`text-sm ${i < difficulty ? 'text-amber-400' : 'text-ink-200'}`}>
          ★
        </span>
      ))}
    </div>
  )
}

function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const previousFocus = document.activeElement as HTMLElement | null

    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable[0]?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      previousFocus?.focus()
    }
  }, [containerRef, onClose])
}

export default function SpotPopup({ spot, onClose, userTier = 'anonymous' }: SpotPopupProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef, onClose)

  const isPaid = userTier === 'local' || userTier === 'itinerant'
  const showGps = spot.isPrecise
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Spot : ${spot.name}`}
      className={[
        'fixed bottom-0 left-0 right-0 z-20',
        'rounded-t-2xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
        'md:absolute md:bottom-auto md:left-auto md:top-4 md:right-4 md:w-80',
        'md:rounded-2xl md:shadow-xl',
      ].join(' ')}
    >
      {/* Drag handle (mobile) */}
      <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
        <div className="w-10 h-1 rounded-full bg-ink-200" />
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-ink-900 text-base leading-tight truncate">
              {spot.name}
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">{spot.department}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la fiche spot"
            className="shrink-0 p-1 rounded-full text-ink-500 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Espèces */}
        {spot.species.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">Espèces</p>
            <BadgeList items={spot.species} labels={SPECIES_LABELS} colorClass="bg-teal-500/10 text-teal-700" />
          </div>
        )}

        {/* Techniques */}
        {spot.techniques.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">Techniques</p>
            <BadgeList items={spot.techniques} labels={TECHNIQUE_LABELS} colorClass="bg-navy-900/10 text-navy-900" />
          </div>
        )}

        {/* Sections abonnés */}
        {isPaid && (
          <>
            {/* Difficulté + Structure */}
            {(!!spot.difficulty || !!spot.structure) && (
              <div className="flex items-center gap-3 flex-wrap">
                {!!spot.difficulty && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">Difficulté</p>
                    <DifficultyStars difficulty={spot.difficulty} />
                  </div>
                )}
                {!!spot.structure && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">Structure</p>
                    <span className="text-sm text-ink-700">
                      {STRUCTURE_ICONS[spot.structure] ?? ''} {STRUCTURE_LABELS[spot.structure] ?? spot.structure}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Score placeholder */}
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">Score</p>
              <div className="relative group">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-ink-100 text-ink-400">
                  — / 100
                </span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-ink-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                    Calibrage en cours — disponible dans la prochaine version
                  </div>
                  <div className="w-2 h-2 bg-ink-900 rotate-45 mx-auto -mt-1" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Message gating (non-abonnés) */}
        {!isPaid && (
          <div className="flex items-start gap-2 bg-ink-100 rounded-xl p-3">
            <Lock size={14} className="text-ink-500 mt-0.5 shrink-0" />
            <p className="text-xs text-ink-500 leading-snug">
              Coords précises et fiche complète réservées aux abonnés{' '}
              <Link href="/tarifs" className="text-teal-600 hover:underline font-medium">
                Local / Itinérant
              </Link>
            </p>
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-2 pt-1">
          <Link
            href={`/spots/${spot.slug}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <MapPin size={16} />
            Voir le spot complet
          </Link>

          {isPaid && (
            <Link
              href={`/carnet/nouvelle?spot_id=${spot.id}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              <Fish size={16} />
              Logger une prise ici
            </Link>
          )}

          {showGps && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              <Navigation size={16} />
              Itinéraire GPS
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export type { SpotPopupProps }
