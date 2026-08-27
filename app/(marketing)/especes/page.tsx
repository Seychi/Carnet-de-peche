import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SPECIES, type SpeciesSlug } from '@/lib/seo/programmatic'
import { ESPECES_CONTENT } from '@/lib/especes/content'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { MarketingCTA } from '@/components/marketing/MarketingCTA'
import { SpeciesCover } from '@/components/especes/species-cover'

// Page 100 % statique : les espèces viennent de modules statiques (SPECIES,
// ESPECES_CONTENT), aucune lecture async/réseau au rendu. Donc pas de loading.tsx.
//
// Les couvertures étaient des SVG décoratifs (<Bathy> + icône) « pour garder le
// CLS nul ». Elles sont maintenant des planches (next/image), et le CLS reste nul
// pour une autre raison : <SpeciesCover> fige le ratio en CSS, la boîte est donc
// réservée avant le premier octet téléchargé. Les fichiers sont servis depuis
// public/images/especes/, générés par `pnpm species:images`. Une espèce sans
// planche retombe sur l'ancien motif — voir components/especes/species-cover.
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
            {especes.map((slug, i) => {
              const sp = SPECIES[slug]
              const content = ESPECES_CONTENT[slug]
              return (
                <Link
                  key={slug}
                  href={`/especes/${slug}`}
                  className="group flex flex-col overflow-hidden rounded-[18px] border border-sand-200 bg-white transition-colors hover:border-teal-500/40"
                >
                  <SpeciesCover
                    slug={slug}
                    // Grille 1 / 2 / 3 colonnes dans un conteneur de 1100 px : une
                    // carte fait toute la largeur en mobile, la moitié en sm, ~360 px
                    // au-delà. Sans `sizes`, Next servirait la variante 100vw partout.
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                    // Seule la première rangée est au-dessus de la ligne de flottaison
                    // sur un écran de bureau. Précharger les 26 coûterait la bande
                    // passante de toute la grille pour trois images vues.
                    priority={i < 3}
                    imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
                  >
                    <TagData className="absolute bottom-2.5 left-4 text-white/40">
                      {sp.latin.toUpperCase()}
                    </TagData>
                  </SpeciesCover>
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
