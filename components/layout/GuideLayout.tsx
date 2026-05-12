import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowLeft } from 'lucide-react'

interface RelatedGuide {
  slug: string
  title: string
}

interface GuideLayoutProps {
  title: string
  excerpt: string
  readTime: number
  publishedAt: string
  category: string
  species: string
  heroImage?: string
  heroImageAlt?: string
  relatedGuides?: RelatedGuide[]
  children: React.ReactNode
}

function HeroImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full bg-navy-900" style={{ height: 420 }}>
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-sand-50 via-transparent to-transparent" />
    </div>
  )
}

export function GuideLayout({
  title,
  excerpt,
  readTime,
  publishedAt,
  category,
  species,
  heroImage,
  heroImageAlt,
  relatedGuides = [],
  children,
}: GuideLayoutProps) {
  return (
    <main className="bg-sand-50 min-h-screen">
      {/* Hero */}
      <section className={`bg-navy-900 pt-10 ${heroImage ? 'pb-0' : 'pb-14'}`}>
        <div className="max-w-[1280px] mx-auto px-6">
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Tous les guides
          </Link>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-1 rounded-full">
              {category}
            </span>
            <span className="text-xs text-white/40 bg-white/10 px-3 py-1 rounded-full">
              {species}
            </span>
          </div>
          <h1 className="text-white font-display max-w-3xl">{title}</h1>
          <p className="mt-4 text-white/60 max-w-2xl text-lg leading-relaxed">{excerpt}</p>
          <div className="flex items-center gap-4 mt-6 text-sm text-white/40">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {readTime} min de lecture
            </span>
            <span>·</span>
            <span>{publishedAt}</span>
          </div>
        </div>
      </section>

      {/* Image de couverture */}
      {heroImage && (
        <HeroImage src={heroImage} alt={heroImageAlt ?? title} />
      )}

      {/* Corps */}
      <div className="max-w-[1280px] mx-auto px-6 py-14">
        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-16 xl:gap-20">

          {/* Article */}
          <article className="prose prose-slate max-w-none
            prose-headings:font-display prose-headings:text-navy-900
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:scroll-mt-8
            prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
            prose-p:text-ink-700 prose-p:leading-relaxed
            prose-a:text-teal-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-navy-900
            prose-li:text-ink-700
            prose-ul:my-4
          ">
            {children}

            {/* CTA milieu / fin — inséré automatiquement en bas */}
            <div className="not-prose mt-12 p-6 bg-teal-500/10 border border-teal-500/20 rounded-[18px] text-center">
              <p className="font-semibold text-navy-900 mb-2">
                Logue ta prochaine prise de {species.split(' ')[0].toLowerCase()}
              </p>
              <p className="text-sm text-ink-500 mb-4">
                Rejoins la communauté et crée ton carnet de pêche gratuit.
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm rounded-[10px] transition-colors duration-200"
              >
                Créer mon carnet gratuit →
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 flex flex-col gap-5">
              {/* Guides suivants */}
              {relatedGuides.length > 0 && (
                <div className="bg-white border border-ink-100 rounded-[18px] p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-4">
                    Lire aussi
                  </p>
                  <ul className="flex flex-col gap-3">
                    {relatedGuides.map((g) => (
                      <li key={g.slug}>
                        <Link
                          href={`/guides/${g.slug}`}
                          className="text-sm text-navy-900 hover:text-teal-700 transition-colors leading-snug"
                        >
                          {g.title} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA abonnement */}
              <div className="bg-navy-900 rounded-[18px] p-6 text-center">
                <p className="text-white font-semibold text-sm mb-2">Trouve les spots près de chez toi</p>
                <p className="text-white/60 text-xs mb-4">
                  Carte intelligente, score d'activité, filtres espèces.
                </p>
                <Link
                  href="/tarifs"
                  className="block px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm rounded-[10px] transition-colors duration-200"
                >
                  Voir les formules
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
