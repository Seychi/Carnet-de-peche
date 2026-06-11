import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowLeft } from 'lucide-react'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'

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
  /** Date de vérification des infos réglementaires (affichée en gold). */
  verifiedAt?: Date
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
  verifiedAt,
  relatedGuides = [],
  children,
}: GuideLayoutProps) {
  return (
    <main className="bg-sand-50 min-h-screen">
      {/* Hero navy-950 + isobathes (DA v2) */}
      <section className={`relative overflow-hidden bg-navy-950 pt-10 ${heroImage ? 'pb-0' : 'pb-14'}`}>
        <Bathy opacity={0.3} />
        <div className="relative max-w-[1280px] mx-auto px-6">
          <Link
            href="/guides"
            className="mb-8 inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-teal-300 transition-colors hover:text-white"
          >
            <ArrowLeft size={12} />
            Tous les guides
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="rounded-full border border-teal-500/30 bg-teal-500/15 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-teal-300">
              {category}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">
              {species}
            </span>
            {verifiedAt && (
              <span className="rounded-full border border-gold-500/35 bg-gold-500/15 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-gold-500">
                Vérifié le{' '}
                {new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' }).format(verifiedAt)}
              </span>
            )}
          </div>
          <h1 className="text-white font-display max-w-3xl">{title}</h1>
          <p className="mt-4 text-white/60 max-w-2xl text-lg leading-relaxed">{excerpt}</p>
          <TagData className="mt-6 flex items-center gap-2 text-white/40">
            <Clock size={13} className="text-white/40" aria-hidden="true" />
            {readTime} MIN DE LECTURE · {publishedAt.toUpperCase()}
          </TagData>
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
                className="inline-block px-6 py-2.5 bg-teal-500 hover:bg-teal-300 text-navy-950 font-semibold text-sm rounded-[10px] transition-colors duration-200"
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
              <div className="relative overflow-hidden bg-navy-950 rounded-[18px] p-6 text-center">
                <Bathy density={2} opacity={0.3} />
                <div className="relative">
                  <p className="text-white font-semibold text-sm mb-2">Trouve les spots près de chez toi</p>
                  <p className="text-white/60 text-xs mb-4">
                    Carte intelligente, score d&apos;activité, filtres espèces.
                  </p>
                  <Link
                    href="/tarifs"
                    className="block px-5 py-2.5 bg-teal-500 hover:bg-teal-300 text-navy-950 font-semibold text-sm rounded-[10px] transition-colors duration-200"
                  >
                    Voir les formules
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
