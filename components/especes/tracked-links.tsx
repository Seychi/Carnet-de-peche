'use client'

import Link from 'next/link'
import { analytics } from '@/lib/analytics'

// Liens INSTRUMENTÉS des fiches espèces (sprint 75, Bloc 5).
//
// La fiche est un Server Component : ces deux wrappers sont la plus petite
// frontière client possible pour porter un `onClick`, sans faire basculer la page
// entière côté client (le contenu doit rester dans le HTML servi, cf Bloc 2).
//
// `capture` no-op sans consentement (gate RGPD S26) : rien à gérer ici.

export function SpeciesCtaLink({
  species,
  position,
  href,
  className,
  children,
}: {
  /** Slug de l'espèce, jamais un libellé traduit : la requête d'analyse doit être stable. */
  species: string
  position: 'inline' | 'sticky' | 'footer'
  href: string
  className?: string
  children: React.ReactNode
}) {
  // Sprint 87 Bloc 4 : marqueurs de mesure, pour que ce gabarit se lise comme les
  // deux autres (`scripts/measure-fold.mjs`, `e2e/10-pli-mobile.spec.ts`).
  //
  // ⚠️ La position `sticky` est volontairement EXCLUE du marqueur. Une barre
  // collante est par construction toujours dans le viewport : la marquer ferait
  // passer le garde-fou « un CTA existe avant 1 000 px » sur n'importe quelle
  // page, y compris une page où le CTA de lecture serait retombé tout en bas.
  // Le test doit mesurer ce que le visiteur rencontre EN LISANT, pas ce qui le
  // suit. Même leçon que le sprint 85 §3, où la barre collante de la fiche spot
  // émettait `spot_page` sans être un mur et confondait la mesure.
  const foldMarker = position === 'sticky' ? undefined : 'cta'

  return (
    <Link
      href={href}
      className={className}
      data-fold={foldMarker}
      data-position={position}
      onClick={() => analytics.speciesPageCtaClicked({ species, position })}
    >
      {children}
    </Link>
  )
}

export function SpeciesSpotLink({
  species,
  spotSlug,
  className,
  children,
}: {
  species: string
  spotSlug: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={`/spots/${spotSlug}`}
      className={className}
      onClick={() => analytics.speciesToSpotClicked({ species, spot_slug: spotSlug })}
    >
      {children}
    </Link>
  )
}
