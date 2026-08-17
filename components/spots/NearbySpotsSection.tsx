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
//
// Sprint 83, Bloc 2 : mise en page seulement. La section reçoit désormais
// jusqu'à 12 entrées (`NEARBY_MAX`), d'où la bascule en liste compacte au-delà
// de 6. Aucune donnée nouvelle, aucun appel supplémentaire, aucun `href`
// construit différemment.

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

/**
 * Ligne secondaire : distance quand elle existe, puis 2 espèces au plus.
 * La distance reste en `font-mono` (DA v2 : tout chiffre métier est en mono),
 * les libellés d'espèces non.
 */
function EntryMeta({ entry, max = 2 }: { entry: NearbyEntry; max?: number }) {
  const species = entry.species
    .slice(0, max)
    .map((s) => SPECIES_LABELS[s] ?? s)
    .join(', ')
  return (
    <>
      {entry.distanceM != null && (
        <span className="font-mono text-ink-600">{formatDistance(entry.distanceM)}</span>
      )}
      {entry.distanceM != null && species && ' · '}
      {species}
    </>
  )
}

/**
 * Au-delà de ce nombre d'entrées, la grille de cartes devient une liste compacte.
 * Sprint 83, Bloc 2 : `NEARBY_MAX` est passé de 6 à 12 pour densifier le maillage
 * interne. En 390 px de large, la grille est à UNE colonne : 12 cartes de ~78 px
 * empilées faisaient ~940 px de défilement pour une section secondaire, en plein
 * milieu de la page qui porte 80 % des clics Google. La liste compacte descend à
 * ~48 px par entrée, tap target de 44 px préservé.
 *
 * Le filet passe sous CHAQUE ligne, y compris la dernière : en 2 ou 3 colonnes,
 * un `last:border-b-0` ne retirerait le filet que du 12e élément et laisserait
 * les 10e et 11e avec le leur, ce qui se voit. Uniforme = lisible aux 3 largeurs.
 */
const COMPACT_THRESHOLD = 6

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

  const compact = entries.length > COMPACT_THRESHOLD

  return (
    <section className="bg-white rounded-[18px] border border-sand-200 p-6 md:p-7">
      <h2 className="font-display text-navy-900 text-xl mb-4">{title}</h2>

      {compact ? (
        <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <li key={entry.slug} className="border-b border-sand-200">
              <Link
                href={`/spots/${entry.slug}`}
                onClick={() =>
                  analytics.spotToSpotClicked({ from_slug: fromSlug, to_slug: entry.slug })
                }
                className="group flex min-h-11 items-center justify-between gap-3 py-2"
              >
                {/* `min-w-0` OBLIGATOIRE : un enfant de flex a `min-width: auto`,
                    donc `truncate` seul ne tronque rien et un nom long déborde
                    la carte en 390 px. Le texte complet reste dans le DOM (la
                    coupe est purement visuelle), l'ancre ne perd rien. */}
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-navy-900 group-hover:text-teal-700">
                  {entry.name}
                </span>
                <span className="shrink-0 text-xs text-ink-500">
                  <EntryMeta entry={entry} max={1} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
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
                <EntryMeta entry={entry} />
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
