'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import {
  buildSignupHref,
  SIGNUP_WALL_BENEFITS,
  SIGNUP_WALL_BENEFITS_SPOT,
  SIGNUP_WALL_CTA,
  SIGNUP_WALL_NOTE,
  SIGNUP_WALL_TITLE,
  SIGNUP_WALL_TITLE_SPOT,
  wallCopyForSurface,
  type SignupWallSurface,
} from '@/lib/gating/wall'

// ─── Mur d'INSCRIPTION (sprint 75, Bloc 1) ────────────────────────────────────
// Ce que voit un visiteur ANONYME à la place de l'upsell abonnement. Zéro prix,
// zéro « Local 4,90 € » : il n'a rien à acheter, il a un carnet gratuit à créer.
// L'upsell (UpsellBanner + encarts /tarifs) reste servi aux inscrits gratuits.
//
// ⚠️ Purement présentation : aucune donnée payante n'est libérée ici.

const COOKIE_NAME = 'signup-banner-dismissed-at' // distinct de `upsell-dismissed-at`
const DISMISS_DURATION_DAYS = 7
const BANNER_SURFACE: SignupWallSurface = 'banner'

/** Chemin courant (query comprise) pour ramener le visiteur exactement où il était. */
function useCurrentPath(): string {
  const pathname = usePathname()
  const [path, setPath] = useState(pathname)
  useEffect(() => {
    setPath(window.location.pathname + window.location.search)
  }, [pathname])
  return path
}

function isBannerDismissed(): boolean {
  if (typeof document === 'undefined') return false
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=(\\d+)`),
  )
  if (!match) return false
  const at = Number(match[1])
  if (!Number.isFinite(at)) return false
  return Date.now() - at < DISMISS_DURATION_DAYS * 24 * 60 * 60 * 1000
}

// ─── Encart réutilisable ─────────────────────────────────────────────────────

type SignupWallProps = {
  /** Identifiant STABLE de la surface (analytics). */
  surface: SignupWallSurface
  /** Cible de retour post-inscription. Par défaut : l'URL courante. */
  redirectTo?: string
  /** Titre (défaut : « Crée ton carnet, c'est gratuit »). */
  title?: string
  /**
   * Nom du spot lu (sprint 76, Bloc 1). Fourni → titre et bénéfices parlent DU
   * SPOT au lieu du produit. Absent → copie générique, DOM strictement inchangé.
   * `title` explicite reste prioritaire sur la variante contextualisée.
   */
  spotName?: string
  /** Ligne de contexte propre à la surface, affichée sous le titre. */
  intro?: string
  /** Version resserrée (petits panneaux) : pas de liste d'avantages. */
  compact?: boolean
  /** Fond sombre (navy) au lieu de l'encart clair. */
  tone?: 'light' | 'dark'
  /**
   * `false` quand le mur est monté mais hors écran (sidebar masquée en CSS) :
   * on n'envoie alors aucun event « vu », pour ne pas gonfler le funnel.
   */
  track?: boolean
  className?: string
}

export function SignupWall({
  surface,
  redirectTo,
  title,
  spotName,
  intro,
  compact = false,
  tone = 'light',
  track = true,
  className = '',
}: SignupWallProps) {
  const currentPath = useCurrentPath()
  const href = buildSignupHref(redirectTo ?? currentPath)
  const dark = tone === 'dark'

  // Sprint 77, Bloc 2 et 4 : une surface de COUPURE (spot_tides, spot_score,
  // spot_catches, pending_favorite, pending_catch) nomme ce qui est derrière
  // elle. Le mur mesuré à 1,3 % de clic promettait au visiteur ce qu'il venait
  // de recevoir : cette copie-là est la correction.
  //
  // Ordre de priorité, du plus explicite au plus générique :
  //   1. `title` passé en prop        2. copie de la coupure
  //   3. copie contextualisée au spot 4. copie générique
  // Sans surface de coupure ET sans `spotName`, on retombe EXACTEMENT sur la
  // copie générique (non-régression des surfaces carte, testée).
  const cutCopy = wallCopyForSurface(surface, spotName)
  const resolvedTitle =
    title ??
    cutCopy?.title ??
    (spotName ? SIGNUP_WALL_TITLE_SPOT(spotName) : SIGNUP_WALL_TITLE)
  const benefits =
    cutCopy?.benefits ?? (spotName ? SIGNUP_WALL_BENEFITS_SPOT : SIGNUP_WALL_BENEFITS)

  useEffect(() => {
    if (!track) return
    analytics.signupWallViewed({ surface })
  }, [surface, track])

  return (
    <div
      className={[
        'rounded-xl p-3',
        dark
          ? 'bg-navy-900 border border-white/10'
          : 'bg-teal-500/[0.07] border border-teal-500/30',
        className,
      ].join(' ')}
    >
      <p
        className={[
          'text-[13.5px] font-semibold leading-snug',
          dark ? 'text-white' : 'text-ink-900',
        ].join(' ')}
      >
        {resolvedTitle}
      </p>

      {intro && (
        <p
          className={[
            'mt-1 text-xs leading-snug',
            dark ? 'text-white/70' : 'text-ink-600',
          ].join(' ')}
        >
          {intro}
        </p>
      )}

      {!compact && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {benefits.map((benefit) => (
            <li
              key={benefit}
              className={[
                'flex items-start gap-1.5 text-xs leading-snug',
                dark ? 'text-white/80' : 'text-ink-600',
              ].join(' ')}
            >
              <Check
                size={13}
                aria-hidden="true"
                className={['mt-px shrink-0', dark ? 'text-teal-300' : 'text-teal-600'].join(' ')}
              />
              {benefit}
            </li>
          ))}
        </ul>
      )}

      <Link
        href={href}
        onClick={() => analytics.signupWallClicked({ surface })}
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-500 px-4 text-[13.5px] font-semibold text-navy-950 transition-colors hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        {SIGNUP_WALL_CTA}
      </Link>

      {!compact && (
        <p
          className={[
            'mt-2 text-center text-[11px]',
            dark ? 'text-white/50' : 'text-ink-400',
          ].join(' ')}
        >
          {SIGNUP_WALL_NOTE}
        </p>
      )}
    </div>
  )
}

// ─── Bandeau bas de carte ────────────────────────────────────────────────────
// Même emplacement que UpsellBanner (fixed bottom, dismiss 7 jours), mais cookie
// distinct : fermer le mur gratuit ne ferme pas le mur abonnement, et l'inverse.
//
// Mobile : le contenu est empilé et laisse libre la colonne de droite (les FAB
// « géoloc » / « spots autour de moi » de /carte sont en z-50 par-dessus, ils
// recouvraient le CTA de l'ancien bandeau anonyme sur un écran de 390 px).

export default function SignupBanner() {
  const [visible, setVisible] = useState(false)
  const [entered, setEntered] = useState(false)
  const currentPath = useCurrentPath()
  const href = buildSignupHref(currentPath)

  useEffect(() => {
    if (isBannerDismissed()) return
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    analytics.signupWallViewed({ surface: BANNER_SURFACE })
    const timer = setTimeout(() => setEntered(true), 60)
    return () => clearTimeout(timer)
  }, [visible])

  function handleDismiss() {
    const maxAge = DISMISS_DURATION_DAYS * 24 * 60 * 60
    document.cookie = `${COOKIE_NAME}=${Date.now()}; path=/; max-age=${maxAge}; SameSite=Lax`
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className={[
        'fixed bottom-0 left-0 right-0 z-40',
        'transition-transform duration-300 ease-out',
        entered ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="mx-auto max-w-2xl pb-3 pl-3 pr-[4.75rem] md:pr-3">
        <div className="relative flex flex-col gap-2.5 rounded-2xl border-t-2 border-teal-500 bg-navy-900 px-4 py-3 shadow-xl sm:flex-row sm:items-center sm:gap-3">
          <p className="flex-1 pr-6 text-sm leading-snug text-white/85 sm:pr-0">
            <span className="font-semibold text-white">{SIGNUP_WALL_TITLE}.</span>{' '}
            Tes prises, les marées de tes spots et le fil de ton département.
          </p>
          <Link
            href={href}
            onClick={() => analytics.signupWallClicked({ surface: BANNER_SURFACE })}
            className="flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-xl bg-teal-500 px-4 text-sm font-semibold text-navy-950 transition-colors hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 sm:w-auto"
          >
            {SIGNUP_WALL_CTA}
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Fermer"
            className="absolute right-2 top-2 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:static sm:shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
