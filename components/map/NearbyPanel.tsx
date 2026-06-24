'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { X, AlertCircle, RotateCcw, Fish, Star } from 'lucide-react'
import type { NearbySpot } from '@/lib/spots/nearby'
import type { UserTier } from '@/lib/auth/tier'
import { SPECIES_LABELS } from '@/lib/labels'
import { analytics } from '@/lib/analytics'

const UPSELL_SURFACE = 'nearby_panel'

// Limite de spots affichés par tier (gating côté client)
const TIER_LIMITS: Record<UserTier, number> = {
  anonymous: 3,
  discovery: 5,
  local: 20,
  itinerant: 50,
}

type SortKey = 'distance' | 'difficulty' | 'species'

type NearbyPanelProps = {
  results: NearbySpot[]
  userLocation: { lat: number; lng: number } | null
  userTier: UserTier
  isLoading: boolean
  error: string | null
  onResultClick?: (spot: NearbySpot) => void
  onRetry?: () => void
  onClose: () => void
  layout: 'sidebar' | 'sheet'
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `à ${Math.round(meters)} m`
  const km = meters / 1000
  if (km < 10) return `à ${km.toFixed(1).replace('.', ',')} km`
  return `à ${Math.round(km)} km`
}

function DifficultyStars({ difficulty }: { difficulty: number }) {
  if (!difficulty || difficulty < 1) return null
  return (
    <div role="img" className="flex gap-0.5" aria-label={`Difficulté ${difficulty}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={13}
          aria-hidden
          className={i < difficulty ? 'fill-gold-500 text-gold-500' : 'text-ink-300'}
        />
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse p-3 rounded-xl bg-ink-50 space-y-2">
      <div className="flex justify-between">
        <div className="h-4 bg-ink-200 rounded w-2/3" />
        <div className="h-4 bg-ink-200 rounded w-1/5" />
      </div>
      <div className="h-3 bg-ink-200 rounded w-1/2" />
      <div className="flex gap-1.5">
        <div className="h-5 w-12 bg-ink-200 rounded-full" />
        <div className="h-5 w-14 bg-ink-200 rounded-full" />
        <div className="h-5 w-10 bg-ink-200 rounded-full" />
      </div>
    </div>
  )
}

const SORT_LABELS: Record<SortKey, string> = {
  distance: 'Distance',
  difficulty: 'Difficulté',
  species: 'Espèces',
}

export default function NearbyPanel({
  results,
  userTier,
  isLoading,
  error,
  onResultClick,
  onRetry,
  onClose,
  layout,
}: NearbyPanelProps) {
  const [sort, setSort] = useState<SortKey>('distance')

  const limit = TIER_LIMITS[userTier]
  const showUpsell = userTier === 'discovery'

  // Paywall vu : l'encart upsell du panneau « spots autour de moi » est affiché.
  useEffect(() => {
    if (showUpsell && !isLoading) analytics.paywallViewed({ surface: UPSELL_SURFACE })
  }, [showUpsell, isLoading])

  const sorted = useMemo(() => {
    const copy = [...results]
    if (sort === 'difficulty') copy.sort((a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0))
    else if (sort === 'species') copy.sort((a, b) => b.species.length - a.species.length)
    // distance : ordre RPC déjà correct
    return copy.slice(0, limit)
  }, [results, sort, limit])

  // sidebar : remplace l'aside — hauteur fournie par le parent
  // sheet  : dans SheetContent qui fournit height + rounded-t-2xl
  const containerCls =
    layout === 'sidebar'
      ? 'h-full flex flex-col bg-white border-r border-ink-100'
      : 'flex flex-col h-full bg-white'

  const totalShown = sorted.length
  const totalRaw = results.length

  return (
    <div className={containerCls}>
      {/* Drag handle (sheet / mobile uniquement) */}
      {layout === 'sheet' && (
        <div className="flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-ink-200" />
        </div>
      )}

      {/* Header sticky */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-ink-100">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-ink-900 text-base leading-tight">
              Spots autour de moi
            </h2>
            {!isLoading && !error && (
              <p className="text-xs text-ink-500 mt-0.5">
                <span className="font-mono">{totalShown}</span> résultat{totalShown !== 1 ? 's' : ''}
                {totalRaw > limit && (
                  <span className="text-teal-600 font-medium"> · limite <span className="font-mono">{limit}</span></span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le panneau"
            className="shrink-0 p-1.5 rounded-full text-ink-500 hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sort toggle */}
        {!isLoading && !error && results.length > 1 && (
          <div className="flex gap-1 mt-3">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={[
                  'px-2.5 py-1 rounded-full text-xs transition-colors',
                  sort === key
                    ? 'bg-teal-500 text-navy-950 font-semibold'
                    : 'bg-ink-100 text-ink-600 font-medium hover:bg-ink-200',
                ].join(' ')}
              >
                {SORT_LABELS[key]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading && (
          <>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm text-ink-600 leading-snug">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-100 text-ink-700 text-sm font-medium hover:bg-ink-200 transition-colors"
              >
                <RotateCcw size={14} />
                Réessayer
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && sorted.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
            <Fish size={28} className="text-teal-500" aria-hidden="true" />
            <p className="text-sm text-ink-600 leading-snug">
              Aucun spot dans un rayon de 50 km. Essaie d&apos;élargir tes filtres ou de zoomer
              ailleurs.
            </p>
          </div>
        )}

        {!isLoading && !error && sorted.length > 0 && (
          <>
            {sorted.map((spot) => (
              <NearbyCard
                key={spot.id}
                spot={spot}
                onClick={onResultClick ? () => onResultClick(spot) : undefined}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer upsell (discovery uniquement) */}
      {showUpsell && !isLoading && (
        <div className="shrink-0 px-4 py-3 border-t border-ink-100">
          <div className="bg-navy-900 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-white/80 leading-snug">
              Tu vois{' '}
              <span className="text-white font-semibold"><span className="font-mono">{TIER_LIMITS.discovery}</span> spots max</span>.
              Passe{' '}
              <span className="text-teal-400 font-semibold">Local</span> pour <span className="font-mono">{TIER_LIMITS.local}</span>,{' '}
              <span className="text-teal-400 font-semibold">Itinérant</span> pour <span className="font-mono">{TIER_LIMITS.itinerant}</span>.
            </p>
            <Link
              href="/tarifs"
              onClick={() => analytics.upsellClicked({ surface: UPSELL_SURFACE })}
              className="shrink-0 px-2.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card ──────────────────────────────────────────────────────────────────────

const MAX_SPECIES_BADGES = 3

function NearbyCard({
  spot,
  onClick,
}: {
  spot: NearbySpot
  onClick?: () => void
}) {
  const badges = spot.species.slice(0, MAX_SPECIES_BADGES)
  const overflow = spot.species.length - MAX_SPECIES_BADGES

  return (
    <Link
      href={`/spots/${spot.slug}`}
      onClick={onClick}
      className="block p-3 rounded-xl hover:bg-ink-50 border border-ink-100 hover:border-teal-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 group"
    >
      {/* Ligne 1 : nom + distance */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-ink-900 text-sm leading-tight group-hover:text-teal-700 transition-colors">
          {spot.name}
        </span>
        <span className="shrink-0 font-mono text-xs text-ink-500 tabular-nums mt-0.5">
          {formatDistance(spot.distance_m)}
        </span>
      </div>

      {/* Ligne 2 : département + difficulté */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-ink-500">{spot.department.trim()}</span>
        <DifficultyStars difficulty={spot.difficulty} />
      </div>

      {/* Ligne 3 : badges espèces */}
      {spot.species.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {badges.map((sp) => (
            <span
              key={sp}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-700"
            >
              {SPECIES_LABELS[sp] ?? sp}
            </span>
          ))}
          {overflow > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-ink-100 text-ink-500">
              +{overflow}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
