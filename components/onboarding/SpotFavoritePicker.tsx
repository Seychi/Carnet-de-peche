'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { toggleFavoriteSpot } from '@/app/actions/favorites'

export type PickerSpot = {
  id: string
  name: string
  /** Libellé FR déjà résolu côté serveur (STRUCTURE_LABELS) ; null = non renseigné. */
  structureLabel: string | null
}

/**
 * Sélecteur de spot favori sur l'écran de fin d'onboarding (sprint 74, Bloc 2).
 *
 * Réutilise `toggleFavoriteSpot` (server action existante du sprint 72, RLS
 * own-only, cap 10 en trigger DB) : ce composant n'écrit rien lui-même, il
 * orchestre juste l'appel + l'optimistic UI. Jamais de coordonnée en prop ici :
 * uniquement (id, name, structure) — le spot reste flouté/verrouillé côté DB
 * de toute façon, mais on ne prend même pas le risque de le lire ici.
 *
 * Daltonisme (John daltonien) : l'état favori n'est JAMAIS porté par la seule
 * couleur. Il est doublé par la FORME (étoile pleine vs contour) ET un libellé
 * texte (« Favori » / « Ajouter »), comme FavoriteSpotButton (components/spots).
 */
export function SpotFavoritePicker({
  spots,
  initialFavoriteIds,
}: {
  spots: PickerSpot[]
  initialFavoriteIds: string[]
}) {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(initialFavoriteIds))
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function toggle(spotId: string) {
    if (pendingId) return // une seule opération à la fois, évite les courses
    const wasFavorite = favorites.has(spotId)
    setError(null)
    setPendingId(spotId)
    setFavorites((prev) => {
      const next = new Set(prev)
      if (wasFavorite) next.delete(spotId)
      else next.add(spotId)
      return next
    })

    startTransition(async () => {
      const res = await toggleFavoriteSpot(spotId)
      if (!res.ok) {
        // Rollback optimiste + message d'erreur retourné par l'action.
        setFavorites((prev) => {
          const next = new Set(prev)
          if (wasFavorite) next.add(spotId)
          else next.delete(spotId)
          return next
        })
        setError(res.error)
      }
      setPendingId(null)
    })
  }

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {spots.map((spot) => {
          const isFavorite = favorites.has(spot.id)
          const isPending = pendingId === spot.id
          return (
            <li key={spot.id}>
              <button
                type="button"
                onClick={() => toggle(spot.id)}
                disabled={isPending}
                aria-pressed={isFavorite}
                aria-label={
                  isFavorite
                    ? `Retirer ${spot.name} des favoris`
                    : `Ajouter ${spot.name} aux favoris`
                }
                className={`flex min-h-11 w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
                  isFavorite
                    ? 'border-gold-500/40 bg-gold-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <Star
                  size={18}
                  aria-hidden="true"
                  className={
                    isFavorite ? 'shrink-0 fill-gold-500 text-gold-500' : 'shrink-0 text-white/35'
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-white">
                    {spot.name}
                  </span>
                  {spot.structureLabel && (
                    <span className="block font-mono text-[10.5px] uppercase tracking-[0.06em] text-white/45">
                      {spot.structureLabel}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
                    isFavorite ? 'text-gold-500' : 'text-white/35'
                  }`}
                >
                  {isFavorite ? 'Favori' : 'Ajouter'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-coral-400">
          {error}
        </p>
      )}
    </div>
  )
}
