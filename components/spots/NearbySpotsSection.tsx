'use client'

import Link from 'next/link'
import { analytics } from '@/lib/analytics'
import { SPECIES_LABELS } from '@/lib/labels'

// Maillage spot → spot (sprint 76, Bloc 10).
//
// Les fiches de spots étaient des culs-de-sac : leurs seuls liens sortants
// allaient vers /spots, /especes, /carte, /guides et /tarifs, JAMAIS vers une
// autre fiche. 54 % des sessions ne voyaient qu'une seule page, et les 416
// fiches ne se transmettaient aucune autorité (profil « Découverte, actuellement
// non indexée » dans GSC).
//
// ⚠️ Composant de PRÉSENTATION : il reçoit des lignes déjà produites par la RPC
// `nearby_spots` ou par une requête passant par la RLS. Il ne construit JAMAIS
// une URL de spot à la main (leçon de la migration 109 et des 941 URLs mortes
// du sitemap) et n'affiche AUCUNE coordonnée.

export type NearbyEntry = {
  slug: string
  name: string
  species: string[]
  /** Distance en mètres, seulement quand elle vient de `nearby_spots`. */
  distanceM?: number
}

function formatDistance(m: number): string {
  const km = m / 1000
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

export function NearbySpotsSection({
  fromSlug,
  title,
  entries,
}: {
  fromSlug: string
  title: string
  entries: NearbyEntry[]
}) {
  if (entries.length === 0) return null

  return (
    <section className="bg-white rounded-[18px] border border-sand-200 p-6 md:p-7">
      <h2 className="font-display text-navy-900 text-xl mb-4">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            href={`/spots/${entry.slug}`}
            onClick={() =>
              analytics.spotToSpotClicked({ from_slug: fromSlug, to_slug: entry.slug })
            }
            className="group rounded-[14px] border border-sand-200 p-4 transition-colors hover:border-teal-500/40"
          >
            <p className="text-[14px] font-semibold leading-snug text-navy-900 group-hover:text-teal-700">
              {entry.name}
            </p>
            <p className="mt-1.5 text-xs text-ink-500">
              {entry.distanceM != null && (
                <span className="font-mono text-ink-600">{formatDistance(entry.distanceM)}</span>
              )}
              {entry.distanceM != null && entry.species.length > 0 && ' · '}
              {entry.species
                .slice(0, 2)
                .map((s) => SPECIES_LABELS[s] ?? s)
                .join(', ')}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
