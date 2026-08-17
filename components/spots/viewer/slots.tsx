'use client'

import Link from 'next/link'
import { Navigation, Lock } from 'lucide-react'
import { TagData } from '@/components/ui-v2/tag-data'
import { FavoriteSpotButton } from '@/components/spots/FavoriteSpotButton'
import { SpotReportButton, SpotConfirmButton } from '@/components/spots/ReportSpotDialog'
import { SpotCatchCard } from '@/components/spots/SpotCatchCard'
import { PersonalTendencies } from '@/components/scoring/PersonalTendencies'
import TideStrengthBand from '@/components/conditions/TideStrengthBand'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { SPECIES_LABELS } from '@/lib/labels'
import { ANON_CATCHES, ANON_ACTIVITY_ROWS, AUTHED_ACTIVITY_ROWS } from '@/lib/spots/viewer'
import type { PersonalTendencies as TendenciesData } from '@/lib/scoring/personal/types'
import { useSpotViewer, ConnectedOnly } from './SpotViewerProvider'

/**
 * Les « deltas connectés » de la fiche spot (sprint 84, Bloc 3).
 *
 * Chaque composant ici rend, côté serveur, EXACTEMENT ce que voit un visiteur sans
 * compte — c'est-à-dire ce qui part au CDN — puis bascule après hydratation avec ce
 * que `/api/spots/[slug]/viewer` a renvoyé.
 *
 * 🔒 Règle non négociable du fichier : aucune de ces bascules ne DÉCIDE quoi que ce
 * soit. La coordonnée précise vient de `get_spot_by_slug` appelée avec la session
 * (SECURITY DEFINER, gatée sur `current_tier`), les favoris et confirmations de
 * lectures RLS `own`, les prises de `catches_for_viewer`. Si la base refuse, il n'y
 * a rien à afficher, point.
 */

// ─── Coordonnées ──────────────────────────────────────────────────────────────

/**
 * Ligne de coordonnées du hero. Statique : « ZONE APPROCHÉE · {structure} ».
 * Un abonné dont la base accorde la position exacte la reçoit après hydratation.
 * Même élément, même hauteur : la bascule ne décale rien.
 */
export function SpotCoordsLine({ structureLabel }: { structureLabel: string }) {
  const { precise } = useSpotViewer()

  return (
    <TagData className="mb-3 block text-white/45 md:mb-5">
      {precise
        ? `${Math.abs(precise.lat).toFixed(4)}°${precise.lat >= 0 ? 'N' : 'S'} · ${Math.abs(precise.lng).toFixed(4)}°${precise.lng >= 0 ? 'E' : 'O'}`
        : `ZONE APPROCHÉE · ${structureLabel.toUpperCase() || 'SPOT'}`}
    </TagData>
  )
}

/**
 * Boutons d'itinéraire. Le HTML statique porte la coordonnée FLOUTÉE arrondie à
 * 3 décimales (cf `roundCachedCoord`), un abonné reçoit la vraie après hydratation.
 */
export function SpotItineraryLinks({
  lat,
  lng,
}: {
  /** Coordonnée publique arrondie, celle qui part dans le HTML mis en cache. */
  lat: number
  lng: number
}) {
  const { precise } = useSpotViewer()
  const y = precise?.lat ?? lat
  const x = precise?.lng ?? lng

  const targets = [
    { label: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${y},${x}` },
    { label: 'Plans', href: `https://maps.apple.com/?daddr=${y},${x}` },
    { label: 'Waze', href: `https://waze.com/ul?ll=${y},${x}&navigate=yes` },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {targets.map((nav) => (
        <a
          key={nav.label}
          href={nav.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center min-h-[44px] px-2 rounded-xl border border-ink-200 bg-white text-ink-700 text-[13px] font-medium hover:bg-ink-50 hover:border-teal-400 transition-colors text-center"
        >
          {nav.label}
        </a>
      ))}
    </div>
  )
}

/**
 * Note « coordonnées approchées » sous la mini-carte. Deux copies distinctes selon
 * qu'on a un compte ou pas ; elle disparaît quand la position exacte est accordée.
 * `data-anon-only` sur la variante sans compte : masquée avant peinture, jamais
 * peinte puis retirée.
 */
export function SpotApproxNote() {
  const { precise, authed } = useSpotViewer()
  if (precise) return null
  return (
    <p className="text-xs text-ink-500 text-center mt-2">
      {authed
        ? 'Coordonnées approchées. Abonne-toi pour le GPS précis'
        : 'Coordonnées approchées, comme pour tous les visiteurs.'}
    </p>
  )
}

/** Encart « GPS précis disponible ». Jamais dans le HTML mis en cache. */
export function SpotPreciseGpsCard() {
  const { precise } = useSpotViewer()
  if (!precise) return null
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${precise.lat},${precise.lng}`
  return (
    <div className="bg-teal-50 border border-teal-100 rounded-[18px] p-6">
      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
        GPS précis disponible
      </p>
      <p className="text-sm text-teal-900 font-mono">
        {precise.lat.toFixed(5)}, {precise.lng.toFixed(5)}
      </p>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 font-medium"
      >
        <Navigation size={13} />
        Ouvrir dans Maps
      </a>
    </div>
  )
}

/**
 * Upsell abonnement : INSCRITS gratuits sans coordonnée précise, jamais un anonyme
 * (règle sprint 75, réaffirmée au sprint 79 Bloc 5). Absent du HTML statique par
 * construction : un visiteur sans compte n'a rien à acheter, et le HTML mis en
 * cache est le sien.
 */
export function SpotSubscribeUpsell() {
  const { authed, precise } = useSpotViewer()
  if (!authed || precise) return null
  return (
    <div className="bg-navy-900 rounded-[18px] p-6 text-center">
      <Lock size={24} strokeWidth={1.5} className="text-teal-400 mx-auto mb-3" />
      <p className="text-white font-semibold text-sm mb-1">Coordonnées précises</p>
      <p className="text-white/60 text-xs mb-5 leading-snug">
        GPS exact, filtres avancés, couches de carte.
      </p>
      <Link
        href="/tarifs"
        className="block px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm rounded-[10px] transition-colors"
      >
        Voir les formules
      </Link>
    </div>
  )
}

// ─── Actions liées au compte ──────────────────────────────────────────────────

/**
 * Étoile favori. Sans compte, `loginHref` bascule le bouton en mode BROUILLON
 * (cookie, sprint 77 Bloc 7) : c'est le comportement du HTML statique. Une fois la
 * session connue, on remonte le bouton en mode réel avec l'état lu en base.
 * La `key` force un remontage propre : les deux modes n'ont pas le même état interne.
 */
export function SpotFavoriteSlot({
  spotId,
  spotSlug,
  loginHref,
}: {
  spotId: string
  /**
   * Cible de retour post-inscription. Elle vaut la même chose que celle déduite du
   * `loginHref` par le composant, on la passe explicitement plutôt que de la lui
   * faire re-parser. `spotName` n'est VOLONTAIREMENT pas transmis : il changerait
   * le titre du mur « brouillon » servi aux visiteurs sans compte, et ce sprint ne
   * touche à aucune copie.
   */
  spotSlug: string
  loginHref: string
}) {
  const { authed, favorite } = useSpotViewer()
  return (
    <FavoriteSpotButton
      key={authed ? 'authed' : 'anon'}
      spotId={spotId}
      spotSlug={spotSlug}
      initialFavorite={authed ? favorite : false}
      loginHref={authed ? undefined : loginHref}
      onDark
      className="-mt-1"
    />
  )
}

export function SpotConfirmSlot({
  spotId,
  initialCount,
  loginHref,
}: {
  spotId: string
  initialCount: number
  loginHref: string
}) {
  const { authed, confirmed } = useSpotViewer()
  return (
    <SpotConfirmButton
      key={authed ? 'authed' : 'anon'}
      spotId={spotId}
      initialCount={initialCount}
      initialConfirmed={authed ? confirmed : false}
      loginHref={authed ? undefined : loginHref}
    />
  )
}

export function SpotReportSlot({
  spotId,
  loginHref,
}: {
  spotId: string
  loginHref: string
}) {
  const { authed } = useSpotViewer()
  return <SpotReportButton spotId={spotId} loginHref={authed ? undefined : loginHref} />
}

// ─── Contenus réservés aux comptes ────────────────────────────────────────────

/** Tendances perso « à ce spot » (D-A1 : gratuit dès qu'on a un compte). */
export function SpotTendenciesSlot() {
  const { tendencies } = useSpotViewer()
  if (!tendencies) return null
  return (
    <section className="mt-6">
      <PersonalTendencies data={tendencies as TendenciesData} scopeLabel="à ce spot" />
    </section>
  )
}

/**
 * Prises au-delà des 2 servies dans le HTML statique. Rendues avec le MÊME balisage
 * (`SpotCatchCard`), à la suite, dans la même grille.
 */
export function SpotExtraCatches() {
  const { catches } = useSpotViewer()
  const extra = catches.slice(ANON_CATCHES)
  if (extra.length === 0) return null
  return (
    <>
      {extra.map((c) => (
        <SpotCatchCard key={c.id} c={c} />
      ))}
    </>
  )
}

/** Lignes d'activité au-delà des 2 servies dans le HTML statique. */
export function SpotActivityExtraRows() {
  const { activity } = useSpotViewer()
  const extra = activity.slice(ANON_ACTIVITY_ROWS, AUTHED_ACTIVITY_ROWS)
  if (extra.length === 0) return null
  return (
    <>
      {extra.map((c) => (
        <li key={c.id} className="flex items-center gap-3">
          <Avatar className="size-8 shrink-0">
            {c.avatar_url && <AvatarImage src={c.avatar_url} alt="" />}
            <AvatarFallback className="text-[11px]">
              {(c.display_name || c.username || '?').trim().slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-navy-900">
              <span className="font-semibold">
                {c.display_name || `@${c.username ?? 'pêcheur'}`}
              </span>{' '}
              <span className="text-ink-500">
                · {SPECIES_LABELS[c.species ?? ''] ?? c.species ?? 'prise'}
                {c.size_cm ? ` ${c.size_cm} cm` : ''}
              </span>
            </p>
          </div>
          {c.caught_at && (
            <span className="text-[12px] text-ink-300 shrink-0">
              {formatDistanceToNow(new Date(c.caught_at), { addSuffix: true, locale: fr })}
            </span>
          )}
        </li>
      ))}
    </>
  )
}

/** Bande « force des marées » 7 jours (palier compte gratuit, sprint 77 Bloc 2). */
export function SpotWeekMarnageBand() {
  const { week } = useSpotViewer()
  if (!week || week.marnageDays.length === 0) return null
  return <TideStrengthBand days={week.marnageDays} />
}

/** Ré-export pratique pour la page : un seul point d'import. */
export { ConnectedOnly }
