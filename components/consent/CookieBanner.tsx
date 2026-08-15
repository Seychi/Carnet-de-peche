'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { Cookie, Check, X } from 'lucide-react'
import { readConsent, writeConsent } from '@/lib/consent'
import { readEntryAttribution } from '@/lib/analytics/attribution'

/**
 * Bandeau de consentement analytics (RGPD, sprint 26 / D-F1).
 *
 * - Opt-out par défaut : tant que l'utilisateur n'a pas tranché, PostHog ne
 *   capture rien (opt_out_capturing_by_default dans le provider).
 * - Accepter → opt_in_capturing() ; Refuser → opt_out_capturing().
 * - Choix mémorisé dans un cookie 1ère partie (~6 mois) : le bandeau ne
 *   réapparaît pas tant que le choix tient.
 * - Daltonien : les deux boutons sont distingués par ICÔNE + TEXTE + variante,
 *   jamais par la seule couleur.
 *
 * Ne s'affiche pas si NEXT_PUBLIC_POSTHOG_KEY est absente (rien à mesurer).
 */
export function CookieBanner() {
  // `null` = pas encore évalué (évite un flash au SSR/hydration).
  const [show, setShow] = useState(false)
  const [ready, setReady] = useState(false)

  // ⚠️ SPRINT 78, Bloc 1 — collision mesurée à l'audit du 14/08.
  //
  // Ce bandeau (`z-[60]`) recouvrait le CTA collant des fiches de spot (`z-20`)
  // à **83 %**, et `document.elementFromPoint()` au centre du bouton renvoyait le
  // bandeau : le CTA n'était pas seulement masqué, il était INATTEIGNABLE au
  // doigt. Or le bandeau ne s'affiche qu'aux visiteurs qui n'ont pas encore
  // répondu, c'est-à-dire tous les nouveaux venus, c'est-à-dire l'écrasante
  // majorité des ~690 clics Google hebdomadaires. Le CTA principal de la page qui
  // porte 80 % des clics était donc mort pour la population qu'on cherche à
  // convertir. Ça donne aussi une lecture possible du mur à 1,3 % de clic : une
  // partie du chiffre peut être mécanique et non éditoriale.
  //
  // Plutôt qu'un décalage en dur (qui casserait dès que la copie du bandeau
  // change de hauteur, notamment quand il passe sur deux lignes en 390 px), on
  // publie la hauteur RÉELLE mesurée, et les éléments collants s'y adossent via
  // `--consent-banner-height` (cf app/globals.css).
  const bannerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bannerRef.current
    if (!ready || !show || !el) return
    const root = document.documentElement
    const apply = () => {
      root.style.setProperty('--consent-banner-height', `${el.offsetHeight}px`)
      root.dataset.consentPending = '1'
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => {
      observer.disconnect()
      delete root.dataset.consentPending
      root.style.removeProperty('--consent-banner-height')
    }
  }, [ready, show])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    // Affiche le bandeau seulement si aucun choix n'a encore été fait.
    setShow(readConsent() === null)
    setReady(true)
  }, [])

  function accept() {
    writeConsent('granted')
    try {
      if (posthog.__loaded) {
        posthog.opt_in_capturing()
        // Sprint 76, Bloc 7 : la page SUR LAQUELLE le visiteur consent n'était
        // jamais comptée. `PageViewTracker` avait déjà joué son effet pour
        // cette route (en pure perte, capture opt-out), et ses dépendances
        // [pathname, searchParams] ne bougent pas du fait du consentement : il
        // ne se rejoue pas. On perdait donc systématiquement le pageview
        // d'ENTRÉE, le seul qui porte le referrer de Google, d'où 42 % de trafic
        // classé en auto-référencement. On l'émet ici, avec la source d'entrée
        // mémorisée au chargement (aucune émission n'a eu lieu avant ce clic).
        posthog.capture('$pageview', {
          $current_url: window.location.href,
          ...readEntryAttribution(),
        })
      }
    } catch {
      /* no-op : ne jamais casser sur l'analytics */
    }
    setShow(false)
  }

  function decline() {
    writeConsent('denied')
    try {
      if (posthog.__loaded) {
        posthog.opt_out_capturing()
        // Pas de persistance résiduelle si l'utilisateur refuse.
        posthog.set_config({ persistence: 'memory' })
      }
    } catch {
      /* no-op */
    }
    setShow(false)
  }

  if (!ready || !show) return null

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label="Consentement à la mesure d'audience"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-xl flex-col gap-3 rounded-[14px] border border-white/10 bg-navy-950 p-4 text-white shadow-xl sm:flex-row sm:items-center desk:bottom-5"
    >
      <Cookie size={20} className="shrink-0 text-gold-500" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/90">
        On mesure l&apos;audience du site de façon anonymisée (PostHog, hébergé en
        Europe) pour l&apos;améliorer. Tu peux refuser sans rien perdre.{' '}
        <Link
          href="/legal/confidentialite"
          className="inline-block py-2 underline underline-offset-2 hover:text-white"
        >
          En savoir plus
        </Link>
        .
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={decline}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/20 px-3.5 py-2 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X size={15} aria-hidden="true" />
          Refuser
        </button>
        <button
          type="button"
          onClick={accept}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-[13px] font-semibold text-navy-950 transition-colors hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          <Check size={15} aria-hidden="true" />
          Accepter
        </button>
      </div>
    </div>
  )
}
