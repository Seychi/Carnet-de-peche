import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
import { getTopSpotsForSpecies, countSpotsForSpecies } from '@/lib/especes/top-spots'
import { getPecheLinks } from '@/lib/especes/programmatic-links'
import { SpeciesSpotLink } from '@/components/especes/tracked-links'
import { TagData } from '@/components/ui-v2/tag-data'
import { STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import type { SpeciesSlug } from '@/lib/seo/programmatic'

// « Où pêcher cette espèce » (sprint 23, étendu au sprint 75 Bloc 3).
//
// LE PONT DU SPRINT. /especes pèse 36 % des impressions du site pour 11 % des clics ;
// /spots et /peche convertissent 5× mieux (8,4 % et 7,3 %). Ce bloc envoie donc le
// volume vers le format qui convertit : spots réels groupés par département, lien
// vers la landing de l'espèce, et liens vers les pages programmatiques existantes.
//
// INVARIANTS. Aucune coordonnée n'est affichée (la RPC 049 les gate déjà, et le type
// TopSpot ne les porte pas) ; les compteurs de prises sont k-anon K=3 ; depuis la
// migration 109 la RPC ne renvoie que des spots APPROUVÉS, donc chaque lien mène à
// une fiche qui répond 200 (avant, elle pouvait pointer vers un 404).
//
// CAS VIDE HONNÊTE : espèce sans spot publié → on ne rend RIEN, pas de bloc fantôme
// ni de « bientôt ». En pratique les 26 espèces en ont toutes, mais la défense reste.

const BASE_URL = 'https://www.carnet-de-peche.com'
const SPOTS_SHOWN = 8

export async function SpeciesTopSpots({
  dbKey,
  label,
  speciesSlug,
}: {
  dbKey: string
  label: string
  /** Slug SEO (kebab) : sert le maillage /peche, qui n'existe que pour 6 espèces. */
  speciesSlug: SpeciesSlug
}) {
  const [spots, total] = await Promise.all([
    getTopSpotsForSpecies(dbKey, { limit: SPOTS_SHOWN }),
    countSpotsForSpecies(dbKey),
  ])
  if (spots.length === 0) return null

  // Groupement par département : « où pêcher » est une question géographique avant
  // d'être une liste. L'ordre de la RPC (signal réel) est conservé à l'intérieur.
  const byDept = new Map<string, typeof spots>()
  for (const s of spots) {
    const list = byDept.get(s.department) ?? []
    list.push(s)
    byDept.set(s.department, list)
  }

  const pecheLinks = getPecheLinks(speciesSlug, [...byDept.keys()])

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Meilleurs spots pour pêcher ${label.toLowerCase()} du bord`,
    itemListElement: spots.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/spots/${s.slug}`,
      name: s.name,
    })),
  }

  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <TagData className="mb-3 block">OÙ PÊCHER {label.toUpperCase()}</TagData>

      <div className="flex flex-col gap-4">
        {[...byDept.entries()].map(([dept, list]) => (
          <div key={dept}>
            <TagData className="mb-1.5 block text-ink-400">
              {DEPARTMENT_LABELS[dept]?.toUpperCase() ?? dept}
            </TagData>
            <ul className="flex flex-col gap-0.5">
              {list.map((s) => (
                <li key={s.slug}>
                  <SpeciesSpotLink
                    species={speciesSlug}
                    spotSlug={s.slug}
                    // Sprint 80, Bloc 5 : cible tactile portée à 44 px de haut. Mesurée à
                    // 293 x 37 le 15/08, sur la liste que le sprint 78 venait de
                    // remonter en tête de page POUR qu'elle serve. Le `-mx-2 px-2`
                    // élargit aussi la zone au-delà du texte, sans rien changer au
                    // rendu : c'est la surface qui grandit, pas le visuel.
                    className="group -mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-sand-50"
                  >
                    <MapPin size={14} className="shrink-0 text-teal-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-navy-900 group-hover:text-teal-700">
                        {s.name}
                      </span>
                      <TagData className="block">
                        {s.structure
                          ? (STRUCTURE_LABELS[s.structure] ?? s.structure).toUpperCase()
                          : 'SPOT DU BORD'}
                        {s.speciesCatches > 0 ? ` · ${s.speciesCatches} PRISES 90J` : ''}
                      </TagData>
                    </span>
                  </SpeciesSpotLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Landing de l'espèce. Le compteur vient de la MÊME source que la landing
          (RLS, spots approuvés) : le nombre annoncé est celui qu'on affichera. */}
      {total > spots.length && (
        <Link
          href={`/spots?species=${dbKey}`}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-teal-700 hover:text-teal-900"
        >
          Voir les {total} spots à {label.toLowerCase()}
          <ArrowRight size={13} aria-hidden />
        </Link>
      )}

      {/* Maillage vers les pages programmatiques (7,3 % de CTR), uniquement celles
          qui existent réellement pour cette espèce et ces départements. */}
      {pecheLinks.length > 0 && (
        <div className="mt-4 border-t border-sand-200 pt-3.5">
          <TagData className="mb-2 block text-ink-400">PAR TECHNIQUE ET DÉPARTEMENT</TagData>
          <ul className="flex flex-wrap gap-1.5">
            {pecheLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-block rounded-full border border-sand-200 bg-sand-50 px-2.5 py-1 text-[12px] font-medium text-navy-900 transition-colors hover:border-teal-400 hover:text-teal-700"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function SpeciesTopSpotsSkeleton() {
  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-5">
      <div className="mb-3 h-3 w-36 rounded bg-sand-200" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="size-3.5 rounded-full bg-sand-200" />
            <div className="h-3 flex-1 rounded bg-sand-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
