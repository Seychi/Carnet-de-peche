'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, MapPin, Navigation, Lock } from 'lucide-react'
import type { SpotMarker } from '@/lib/map/utils'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'

type UserTier = 'anonymous' | 'discovery' | 'local' | 'itinerant'

type SpotPopupProps = {
  spot: SpotMarker
  onClose: () => void
  userTier?: UserTier
}

const MAX_BADGES = 2

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
        <span
          key={item}
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
        >
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

// Hook focus trap : maintient le focus à l'intérieur du container.
function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Mémorise l'élément actif avant l'ouverture pour le restaurer à la fermeture
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

  const showUpsell = !spot.isPrecise
  const showGps = spot.isPrecise
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`
  const subtitle = [spot.department, spot.structure ? STRUCTURE_LABELS[spot.structure] : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      {/*
        Desktop : absolute top-right dans le parent relative de la page.
        Mobile : fixed bottom panel avec drag handle visuel.
        Le parent doit avoir position: relative pour que absolute fonctionne sur desktop.
      */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Spot : ${spot.name}`}
        className={[
          // Mobile : panel fixe en bas
          'fixed bottom-0 left-0 right-0 z-20',
          'rounded-t-2xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
          // Desktop : popup absolute top-right, largeur fixe, coins arrondis partout
          'md:fixed md:bottom-auto md:left-auto md:top-auto md:right-auto',
          'md:absolute md:top-4 md:right-4 md:w-80 md:rounded-2xl md:shadow-xl',
        ].join(' ')}
      >
        {/* Drag handle visuel (mobile only) */}
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
              {subtitle && (
                <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>
              )}
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
              <BadgeList
                items={spot.species}
                labels={SPECIES_LABELS}
                colorClass="bg-teal-500/10 text-teal-700"
              />
            </div>
          )}

          {/* Techniques */}
          {spot.techniques.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">Techniques</p>
              <BadgeList
                items={spot.techniques}
                labels={TECHNIQUE_LABELS}
                colorClass="bg-navy-900/10 text-navy-900"
              />
            </div>
          )}

          {/* Message coordonnées floutées */}
          {showUpsell && (
            <div className="flex items-start gap-2 bg-ink-100 rounded-xl p-3">
              <Lock size={14} className="text-ink-500 mt-0.5 shrink-0" />
              <p className="text-xs text-ink-500 leading-snug">
                Coords précises réservées aux abonnés{' '}
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
    </>
  )
}

export type { SpotPopupProps }
