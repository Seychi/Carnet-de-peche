import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { getTopSpotsForSpecies } from '@/lib/especes/top-spots'
import { TagData } from '@/components/ui-v2/tag-data'
import { STRUCTURE_LABELS } from '@/lib/labels'

// « Meilleurs spots pour l'espèce » (sprint 23, WS-B / D-B4) — remplace la sidebar
// non triée. Tri par signal réel (RPC 049) avec repli gracieux. Coords jamais affichées
// (lien fiche spot), counts k-anon.
const BASE_URL = 'https://www.carnet-de-peche.com'

export async function SpeciesTopSpots({ dbKey, label }: { dbKey: string; label: string }) {
  const spots = await getTopSpotsForSpecies(dbKey, { limit: 6 })
  if (spots.length === 0) return null

  // JSON-LD ItemList des meilleurs spots (maillage SEO — WS-C).
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
      <TagData className="mb-3 block">MEILLEURS SPOTS À {label.toUpperCase()}</TagData>
      <ul className="flex flex-col gap-2.5">
        {spots.map((s) => (
          <li key={s.slug}>
            <Link href={`/spots/${s.slug}`} className="group flex items-center gap-2.5">
              <MapPin size={14} className="shrink-0 text-teal-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-navy-900 group-hover:text-teal-700">
                  {s.name}
                </span>
                <TagData className="block">
                  {s.department}
                  {s.structure
                    ? ` · ${(STRUCTURE_LABELS[s.structure] ?? s.structure).toUpperCase()}`
                    : ''}
                  {s.speciesCatches > 0 ? ` · ${s.speciesCatches} PRISES 90J` : ''}
                </TagData>
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
