'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { toggleFavoriteSpot, isFavoriteSpot, type FavoriteSource } from '@/app/actions/favorites'
import { analytics } from '@/lib/analytics'
import { SignupWall } from '@/components/map/SignupBanner'
import { PENDING_FAVORITES_WALL_AT } from '@/lib/drafts/schema'
import { isPendingFavorite, togglePendingFavorite } from '@/lib/drafts/client'
import { safeInternalPath } from '@/lib/auth/redirect'
import { cn } from '@/lib/utils'

// ─── Étoile « spot favori » (sprint 72, Bloc 3) ───────────────────────────────
// Disponible pour TOUS les tiers (les favoris sont du carnet ; seules les alertes
// sont Local/Itinérant). Optimistic UI + rollback, toast doux.
//
// Sprint 77, Bloc 7 : l'étoile est désormais cliquable SANS COMPTE. Le geste
// réussit tout de suite (étoile pleine, aucun rechargement, aucune redirection)
// et le spot part dans un cookie de brouillon. Le compte n'est demandé qu'au 2e
// spot mis de côté, avec la copie de perte (surface `pending_favorite`).
// ⚠️ Aucune ligne n'est créée en base pour un anonyme : le brouillon vit dans le
// navigateur, et il n'est rejoué qu'à l'inscription (lib/drafts/replay.ts).
//
// Daltonisme (John daltonien) : l'état ne passe JAMAIS par la seule couleur.
// Il est doublé par la FORME (étoile pleine vs contour), l'aria-label et
// aria-pressed. Tap target >= 44 px (size-11).

const ADD_LABEL = 'Ajouter aux favoris'
const REMOVE_LABEL = 'Retirer des favoris'

/**
 * Extrait la cible de retour d'un `loginHref` du type
 * `/auth/login?redirect=%2Fspots%2Fxxx`, quand la page n'a pas fourni son slug.
 * Toujours revalidé en chemin interne (anti open-redirect).
 */
function targetFromLoginHref(loginHref: string | undefined): string | null {
  if (!loginHref) return null
  const query = loginHref.split('?')[1]
  if (!query) return null
  const raw = new URLSearchParams(query).get('redirect')
  if (!raw) return null
  const safe = safeInternalPath(raw, '')
  return safe || null
}

export function FavoriteSpotButton({
  spotId,
  initialFavorite,
  loginHref,
  spotSlug,
  spotName,
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
  /**
   * Visiteur anonyme : sa présence signale « pas de compte ». Le bouton bascule
   * alors en mode BROUILLON (cookie) au lieu d'appeler l'action serveur, et
   * cette cible sert de retour post-inscription si le slug n'est pas fourni.
   */
  loginHref?: string
  /** Slug du spot : rend le retour post-inscription exact (sprint 77). */
  spotSlug?: string
  /** Nom du spot : contextualise le titre du mur (« Garde {spot} dans ton carnet »). */
  spotName?: string
  /** Fond sombre (hero navy-950 de la fiche spot). */
  onDark?: boolean
  className?: string
  /** Surface d'origine pour l'event favorite_spot_added (funnel sprint 74). */
  source?: FavoriteSource
}) {
  const anonymous = !!loginHref
  const [favorite, setFavorite] = useState(initialFavorite ?? false)
  const [pending, startTransition] = useTransition()
  const [wallOpen, setWallOpen] = useState(false)

  // Anonyme : l'état vient du cookie de brouillon, lu APRÈS montage (le serveur
  // ne le connaît pas → le lire au premier rendu casserait l'hydratation).
  useEffect(() => {
    if (!anonymous) return
    setFavorite(isPendingFavorite(spotId))
  }, [anonymous, spotId])

  // Lazy-load de l'état quand le serveur ne l'a pas fourni (popup carte).
  useEffect(() => {
    if (anonymous || initialFavorite !== undefined) return
    let cancelled = false
    isFavoriteSpot(spotId).then((res) => {
      if (!cancelled && res.ok) setFavorite(res.data.favorite)
    })
    return () => {
      cancelled = true
    }
  }, [spotId, initialFavorite, anonymous])

  const base = cn(
    'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
    onDark ? 'text-white/70 hover:bg-white/10' : 'text-ink-500 hover:bg-ink-100',
    className,
  )

  // ── Brouillon (visiteur sans compte) ──────────────────────────────────────
  const togglePending = useCallback(() => {
    const res = togglePendingFavorite({
      id: spotId,
      ...(spotSlug ? { slug: spotSlug } : {}),
    })
    if (res.capped) {
      toast.error('Tu as déjà 5 spots de côté. Crée ton carnet pour tous les garder.')
      setWallOpen(true)
      return
    }
    setFavorite(res.favorite)
    if (!res.favorite) {
      toast.success('Retiré de ton brouillon.')
      return
    }
    analytics.pendingFavoriteCreated({ count: res.count })
    // Copie honnête : « brouillon », jamais « enregistré ». Rien n'est en base.
    toast.success('Gardé en brouillon sur cet appareil.')
    if (res.count >= PENDING_FAVORITES_WALL_AT) setWallOpen(true)
  }, [spotId, spotSlug])

  // ── Toggle réel (visiteur connecté) ───────────────────────────────────────
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

  const redirectTo = spotSlug ? `/spots/${spotSlug}` : targetFromLoginHref(loginHref)

  return (
    <>
      <button
        type="button"
        onClick={anonymous ? togglePending : toggle}
        disabled={!anonymous && pending}
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

      {anonymous && wallOpen && (
        <PendingFavoriteWall
          spotName={spotName}
          redirectTo={redirectTo}
          onClose={() => setWallOpen(false)}
        />
      )}
    </>
  )
}

/**
 * Mur de PERTE (sprint 77, Bloc 7). Panneau bas d'écran, non modal : il n'enferme
 * pas le visiteur, il lui dit ce qu'il est sur le point de perdre. La copie vient
 * de `wallCopyForSurface('pending_favorite')` via SignupWall.
 */
function PendingFavoriteWall({
  spotName,
  redirectTo,
  onClose,
}: {
  spotName?: string
  redirectTo: string | null
  onClose: () => void
}) {
  return (
    <div
      role="region"
      aria-label="Garde tes spots"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3"
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="relative mx-auto max-w-md">
        <SignupWall
          surface="pending_favorite"
          spotName={spotName}
          redirectTo={redirectTo ?? undefined}
          tone="dark"
          intro="Tes spots sont gardés en brouillon sur cet appareil, pas encore dans un carnet."
          className="shadow-xl"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-2 top-2 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
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
