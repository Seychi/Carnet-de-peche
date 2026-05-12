import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Guides de pêche à la canne du bord — Carnet de Pêche',
  description: 'Guides pratiques pour la pêche à la canne du bord en France. Bar au leurre, dorade au surfcasting, meilleurs spots Bretagne — rédigés par des pêcheurs passionnés.',
}

const guides = [
  {
    slug: 'peche-au-bar-au-leurre',
    title: 'Pêche au bar au leurre depuis le bord',
    excerpt: "Technique, matériel, saison, postes : tout ce qu'il faut savoir pour démarrer ou progresser sur le bar au leurre depuis la côte.",
    readTime: 8,
    category: 'Technique',
    species: 'Bar',
    image: '/images/bar.jpg',
    imageAlt: 'Bar commun (Dicentrarchus labrax)',
  },
  {
    slug: 'peche-a-la-dorade-royale-au-surfcasting',
    title: 'Pêche à la dorade royale au surfcasting',
    excerpt: 'La dorade royale est un poisson exigeant mais accessible. Découvre les bonnes périodes, les montages et les spots où elle fréquente nos côtes.',
    readTime: 9,
    category: 'Technique',
    species: 'Dorade royale',
    image: '/images/dorade.jpg',
    imageAlt: 'Dorade royale (Sparus aurata)',
  },
  {
    slug: 'les-meilleurs-spots-de-peche-en-bretagne',
    title: 'Les meilleurs spots de pêche en Bretagne',
    excerpt: 'De la Pointe du Raz à Belle-Île, un tour des spots phares de Bretagne pour la pêche à la canne du bord : bar, lieu jaune, maquereau et dorade.',
    readTime: 10,
    category: 'Spots',
    species: 'Multi-espèces',
    image: 'https://images.unsplash.com/photo-1757874905959-9fc34f5abdaa?w=800&h=450&auto=format&fit=crop&q=80',
    imageAlt: 'Falaises et côtes sauvages de Bretagne',
  },
]

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
      <div className="absolute inset-0 bg-navy-900/20 group-hover:bg-navy-900/10 transition-colors duration-300" />
    </div>
  )
}

export default function GuidesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-navy-900 pt-16 pb-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <span className="inline-block text-sm font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-4 py-1.5 rounded-full mb-5">
            Rédigés par des pêcheurs
          </span>
          <h1 className="text-white font-display max-w-2xl">
            Guides pratiques pour la canne du bord
          </h1>
          <p className="mt-4 text-white/60 max-w-xl text-lg">
            Technique, matériel, espèces, spots — des guides concrets écrits par des pêcheurs du bord, pour des pêcheurs du bord.
          </p>
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
                className="group bg-white border border-ink-100 rounded-[18px] overflow-hidden hover:shadow-md hover:border-teal-500/30 transition-all duration-200 flex flex-col"
              >
                {/* Image de couverture */}
                <GuideCardImage src={guide.image} alt={guide.imageAlt} />

                <div className="p-6 flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-teal-500/10 text-teal-700 px-2.5 py-1 rounded-full">
                      {guide.category}
                    </span>
                    <span className="text-xs text-ink-400 bg-ink-100 px-2.5 py-1 rounded-full">
                      {guide.species}
                    </span>
                  </div>
                  <h2 className="font-display text-navy-900 text-lg leading-snug group-hover:text-teal-700 transition-colors">
                    {guide.title}
                  </h2>
                  <p className="text-sm text-ink-500 leading-relaxed flex-1">
                    {guide.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-ink-100 mt-auto">
                    <span className="flex items-center gap-1.5 text-xs text-ink-400">
                      <Clock size={13} />
                      {guide.readTime} min de lecture
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-teal-600 group-hover:gap-2 transition-all">
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
      <section className="bg-white py-14 border-t border-ink-100">
        <div className="max-w-[760px] mx-auto px-6 text-center">
          <h2 className="font-display text-navy-900 text-2xl mb-3">
            Logue tes prises, améliore ta technique
          </h2>
          <p className="text-ink-500 mb-6 text-sm">
            Un carnet de pêche numérique pour suivre tes sessions, analyser tes progrès et partager avec la communauté.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors duration-200 text-sm"
          >
            Créer mon carnet gratuit
          </Link>
        </div>
      </section>
    </main>
  )
}
