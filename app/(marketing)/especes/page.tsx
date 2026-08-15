import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Fish } from 'lucide-react'
import { SPECIES, type SpeciesSlug } from '@/lib/seo/programmatic'
import { ESPECES_CONTENT } from '@/lib/especes/content'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'

// Page 100 % statique : les espèces viennent de modules statiques (SPECIES,
// ESPECES_CONTENT), aucune lecture async/réseau au rendu et les couvertures
// sont des SVG décoratifs (<Bathy>), pas des images distantes. Donc pas de
// loading.tsx ni de next/image à optimiser ici (rien à charger → CLS nul).
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Espèces de la pêche du bord : bar, dorade, lieu jaune',
  description:
    'Bar, dorade, lieu jaune, maquereau, sar, orphie : fiches pour la pêche du bord. Tailles légales vérifiées, saisons par façade, postes et techniques.',
  alternates: { canonical: 'https://www.carnet-de-peche.com/especes' },
}

export default function EspecesIndexPage() {
  const especes = Object.keys(SPECIES) as SpeciesSlug[]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Les espèces de la pêche à la canne du bord',
      itemListElement: especes.map((slug, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://www.carnet-de-peche.com/especes/${slug}`,
        name: SPECIES[slug].label,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.carnet-de-peche.com' },
        { '@type': 'ListItem', position: 2, name: 'Espèces', item: 'https://www.carnet-de-peche.com/especes' },
      ],
    },
  ]

  return (
    <div className="bg-sand-50 min-h-screen">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <section className="relative overflow-hidden bg-navy-950 pt-16 pb-14">
        <Bathy opacity={0.35} withLabels />
        <div className="relative mx-auto max-w-[1100px] px-5">
          <span className="mb-5 inline-flex items-center gap-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-teal-300">
            <span className="inline-block h-px w-7 bg-teal-500" aria-hidden="true" />
            <span className="font-mono">{especes.length}</span> espèces, zéro remplissage
          </span>
          <h1 className="max-w-2xl font-display text-white">Les espèces de la canne du bord</h1>
          <p className="mt-4 max-w-xl text-lg text-white/60">
            Pas un catalogue de 266 poissons : les espèces qu&apos;on pêche vraiment du bord en
            France, traitées à fond : tailles légales vérifiées et datées, saisons par façade,
            techniques et postes.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1100px] px-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {especes.map((slug) => {
              const sp = SPECIES[slug]
              const content = ESPECES_CONTENT[slug]
              return (
                <Link
                  key={slug}
                  href={`/especes/${slug}`}
                  className="group flex flex-col overflow-hidden rounded-[18px] border border-sand-200 bg-white transition-colors hover:border-teal-500/40"
                >
                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-navy-800 to-navy-950">
                    <Bathy density={3} opacity={0.4} />
                    <Fish
                      size={32}
                      strokeWidth={1.7}
                      className="absolute inset-0 m-auto text-teal-300/60"
                      aria-hidden="true"
                    />
                    <TagData className="absolute bottom-2.5 left-4 text-white/40">
                      {sp.latin.toUpperCase()}
                    </TagData>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-5">
                    <h2 className="font-display text-lg leading-snug text-navy-900 group-hover:text-teal-700 transition-colors">
                      {sp.label}
                    </h2>
                    <p className="flex-1 text-sm leading-relaxed text-ink-600">
                      {content.intro[0].length > 140
                        ? `${content.intro[0].slice(0, 140).trimEnd()}…`
                        : content.intro[0]}
                    </p>
                    <div className="mt-auto flex items-center justify-between border-t border-sand-200 pt-3">
                      <TagData>
                        VÉRIFIÉ LE {content.regulation.verifiedAt}
                      </TagData>
                      <span className="flex items-center gap-1 text-xs font-semibold text-teal-700 transition-all group-hover:gap-2">
                        La fiche <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <MarketingCTA
        title="Pêche, note, recommence"
        subtitle="Garde une trace de chaque prise, espèce par espèce, et laisse ton carnet te montrer tes patterns. Gratuit, illimité."
      />
    </div>
  )
}
