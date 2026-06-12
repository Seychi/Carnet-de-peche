import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowRight, Fish } from 'lucide-react'
import { getAllGuides } from '@/lib/guides/loader'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Guides de pêche à la canne du bord — Carnet de Pêche',
  description:
    'Guides pratiques pour la pêche à la canne du bord en France. Bar au leurre, dorade au surfcasting, marées, coefficients, spots — rédigés par des pêcheurs passionnés.',
  alternates: { canonical: 'https://www.carnet-de-peche.com/guides' },
}

function GuideCardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-navy-800">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-navy-950/20 group-hover:bg-navy-950/10 transition-colors duration-300" />
    </div>
  )
}

// Carte sans cover : dégradé navy + isobathes (DA v2, pas de stock photo).
function GuideCardPlaceholder() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-navy-800 to-navy-950">
      <Bathy density={3} opacity={0.4} />
      <Fish
        size={36}
        strokeWidth={1.7}
        className="absolute inset-0 m-auto text-teal-300/60"
        aria-hidden="true"
      />
    </div>
  )
}

export default async function GuidesPage() {
  const guides = await getAllGuides()

  return (
    <div>
      {/* Hero navy-950 + isobathes (DA v2) */}
      <section className="relative overflow-hidden bg-navy-950 pt-16 pb-14">
        <Bathy opacity={0.35} withLabels />
        <div className="relative max-w-[1280px] mx-auto px-6">
          <span className="mb-5 inline-flex items-center gap-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-teal-300">
            <span className="inline-block h-px w-7 bg-teal-500" aria-hidden="true" />
            Rédigés par des pêcheurs
          </span>
          <h1 className="text-white font-display max-w-2xl">
            Guides pratiques pour la canne du bord
          </h1>
          <p className="mt-4 text-white/60 max-w-xl text-lg">
            Technique, matériel, marées, espèces, spots — des guides concrets écrits par des
            pêcheurs du bord, pour des pêcheurs du bord.
          </p>
          <TagData variant="on-dark" className="mt-6 block">
            {guides.length} GUIDE{guides.length > 1 ? 'S' : ''} EN LIGNE · MIS À JOUR EN CONTINU
          </TagData>
        </div>
      </section>

      {/* Liste des guides */}
      <section className="bg-sand-50 py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group bg-white border border-sand-200 rounded-[18px] overflow-hidden hover:border-teal-500/40 transition-colors duration-200 flex flex-col"
              >
                {guide.cover_image ? (
                  <GuideCardImage src={guide.cover_image} alt={guide.cover_image_alt ?? guide.title} />
                ) : (
                  <GuideCardPlaceholder />
                )}

                <div className="p-6 flex flex-col gap-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-teal-500/10 px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-teal-700">
                      {guide.category}
                    </span>
                    <span className="rounded-full bg-sand-100 px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-500">
                      {guide.species}
                    </span>
                  </div>
                  <h2 className="font-display text-navy-900 text-lg leading-snug group-hover:text-teal-700 transition-colors">
                    {guide.title}
                  </h2>
                  <p className="text-sm text-ink-600 leading-relaxed flex-1">{guide.excerpt}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-sand-200 mt-auto">
                    <TagData className="flex items-center gap-1.5">
                      <Clock size={12} aria-hidden="true" />
                      {guide.readTime} MIN
                    </TagData>
                    <span className="flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:gap-2 transition-all">
                      Lire <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-14 border-t border-sand-200">
        <div className="max-w-[760px] mx-auto px-6 text-center">
          <h2 className="font-display text-navy-900 text-2xl mb-3">
            Logue tes prises, améliore ta technique
          </h2>
          <p className="text-ink-600 mb-6 text-sm">
            Un carnet de pêche numérique pour suivre tes sessions, analyser tes progrès et partager
            avec la communauté.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors duration-200 text-sm"
          >
            Créer mon carnet gratuit
          </Link>
        </div>
      </section>
    </div>
  )
}
