'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { toggleFavoriteSpot, isFavoriteSpot, type FavoriteSource } from '@/app/actions/favorites'
import { cn } from '@/lib/utils'

// ─── Étoile « spot favori » (sprint 72, Bloc 3) ───────────────────────────────
// Disponible pour TOUS les tiers (les favoris sont du carnet ; seules les alertes
// sont Local/Itinérant). Optimistic UI + rollback, toast doux.
//
// Daltonisme (John daltonien) : l'état ne passe JAMAIS par la seule couleur.
// Il est doublé par la FORME (étoile pleine vs contour), l'aria-label et
// aria-pressed. Tap target >= 44 px (size-11).

const ADD_LABEL = 'Ajouter aux favoris'
const REMOVE_LABEL = 'Retirer des favoris'

export function FavoriteSpotButton({
  spotId,
  initialFavorite,
  loginHref,
  onDark = false,
  className,
  source = 'spot_page',
}: {
  spotId: string
  /**
   * État initial connu côté serveur (fiche spot). undefined = lazy-load client
   * via isFavoriteSpot (popup carte, où le rendu serveur ne connaît pas l'état).
   */
  initialFavorite?: boolean
  /** Visiteur anonyme : lien de connexion au lieu du toggle. */
  loginHref?: string
  /** Fond sombre (hero navy-950 de la fiche spot). */
  onDark?: boolean
  className?: string
  /** Surface d'origine pour l'event favorite_spot_added (funnel sprint 74). */
  source?: FavoriteSource
}) {
  const [favorite, setFavorite] = useState(initialFavorite ?? false)
  const [pending, startTransition] = useTransition()

  // Lazy-load de l'état quand le serveur ne l'a pas fourni (popup carte).
  useEffect(() => {
    if (initialFavorite !== undefined || loginHref) return
    let cancelled = false
    isFavoriteSpot(spotId).then((res) => {
      if (!cancelled && res.ok) setFavorite(res.data.favorite)
    })
    return () => {
      cancelled = true
    }
  }, [spotId, initialFavorite, loginHref])

  const base = cn(
    'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
    onDark ? 'text-white/70 hover:bg-white/10' : 'text-ink-500 hover:bg-ink-100',
    className,
  )

  if (loginHref) {
    return (
      <Link href={loginHref} aria-label={ADD_LABEL} title={ADD_LABEL} className={base}>
        <Star size={20} aria-hidden="true" />
      </Link>
    )
  }

  function toggle() {
    if (pending) return
    const was = favorite
    setFavorite(!was) // optimiste
    startTransition(async () => {
      const res = await toggleFavoriteSpot(spotId, source)
      if (!res.ok) {
        setFavorite(was) // rollback
        toast.error(res.error)
        return
      }
      setFavorite(res.data.favorite)
      toast.success(
        res.data.favorite ? 'Ajouté à tes spots favoris.' : 'Retiré de tes favoris.',
      )
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={favorite ? REMOVE_LABEL : ADD_LABEL}
      title={favorite ? REMOVE_LABEL : ADD_LABEL}
      className={cn(base, 'disabled:opacity-60')}
    >
      <Star
        size={20}
        aria-hidden="true"
        className={favorite ? 'fill-gold-500 text-gold-500' : undefined}
      />
    </button>
  )
}

/**
 * Bouton « retirer » compact pour les listes de favoris (/profil, réglages).
 * Rafraîchit la page serveur après retrait (router.refresh).
 */
export function RemoveFavoriteButton({ spotId, spotName }: { spotId: string; spotName: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function remove() {
    if (pending) return
    startTransition(async () => {
      const res = await toggleFavoriteSpot(spotId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Retiré de tes favoris.')
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label={`Retirer ${spotName} des favoris`}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <X size={16} aria-hidden="true" />
      )}
    </button>
  )
}
