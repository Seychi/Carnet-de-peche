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
  return (
    <Link
      href={href}
      className={className}
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
