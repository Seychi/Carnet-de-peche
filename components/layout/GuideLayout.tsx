import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowLeft } from 'lucide-react'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { SeoTitle } from '@/components/seo/seo-title'
import { SeoInlineCta } from '@/components/seo/seo-inline-cta'
import { SPECIES_LABELS } from '@/lib/labels'

interface RelatedGuide {
  slug: string
  title: string
}

interface GuideLayoutProps {
  /** Slug du guide. Identifiant PUBLIC, part dans l'analytics du CTA. */
  slug: string
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
  slug,
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
  // CTA bas de guide : libellé d'espèce COMPLET (« dorade royale », plus de
  // troncature au 1er mot), élision « d' » devant voyelle, cas « Multi-espèces ».
  const speciesLower = species.toLowerCase()
  const huntLine =
    species === 'Multi-espèces'
      ? 'Logue ta prochaine prise'
      : /^[aeiouhéèê]/i.test(speciesLower)
        ? `Logue ta prochaine prise d’${speciesLower}`
        : `Logue ta prochaine prise de ${speciesLower}`
  // Sprint 87 Bloc 3 : destination du CTA. Un lecteur de guide n'a AUCUN spot en
  // contexte, contrairement à /peche : on l'envoie sur /spots, qui porte déjà les
  // surfaces d'inscription instrumentées des sprints 76 et 79, au lieu d'inventer
  // un entonnoir. Le frontmatter porte un LIBELLÉ (« Bar »), pas une clé de base :
  // on résout, et on retombe sur /spots nu si l'espèce n'est pas exploitable
  // (« Multi-espèces », ou un libellé hors référentiel).
  const speciesDbKey = Object.keys(SPECIES_LABELS).find(
    (k) => SPECIES_LABELS[k].toLowerCase() === species.toLowerCase(),
  )
  const ctaHref = speciesDbKey ? `/spots?species=${speciesDbKey}` : '/spots'
  const ctaLabel = speciesDbKey ? `Trouver un spot à ${speciesLower}` : 'Trouver un spot'

  // Pas de <main> ici : le layout (marketing) fournit déjà <main id="main">
  // (un seul landmark principal par page, a11y). Sprint 56.
  return (
    <div className="bg-sand-50 min-h-screen">
      {/* Hero navy-950 + isobathes (DA v2) */}
      <section className={`relative overflow-hidden bg-navy-950 pt-7 sm:pt-10 ${heroImage ? 'pb-0' : 'pb-8 sm:pb-12'}`}>
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
          <SeoTitle className="max-w-3xl">{title}</SeoTitle>
          <p className="mt-4 text-white/60 max-w-2xl text-lg leading-relaxed">{excerpt}</p>
          <TagData className="mt-5 flex items-center gap-2 text-white/40">
            <Clock size={13} className="text-white/40" aria-hidden="true" />
            {readTime} MIN DE LECTURE · {publishedAt.toUpperCase()}
          </TagData>
        </div>
      </section>

      {/* Sprint 87 Bloc 3 : le CTA remonte au-dessus du corps MDX. Avant, le seul
          CTA de l'article vivait en TOUTE FIN, et le second était dans une sidebar
          `hidden lg:block`, donc invisible aux 82 % de mobile. */}
      <div className="mx-auto max-w-[1280px] px-6">
        <SeoInlineCta
          template="guide"
          slug={slug}
          position="inline"
          href={ctaHref}
          label={ctaLabel}
          headline={huntLine + '.'}
          note="Marée, météo et conditions enregistrées automatiquement."
        />
      </div>

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

            {/* CTA de fin, pour qui a tout lu.
                ⚠️ Sprint 87 : il était libellé « Créer mon carnet gratuit » et
                pointait `/auth/login`. La promesse et la destination ne
                coïncidaient pas, exactement le défaut corrigé au sprint 85 sur
                /tarifs et la carte Découverte. */}
            <div className="not-prose">
              <SeoInlineCta
                template="guide"
                slug={slug}
                position="footer"
                variant="card"
                href="/auth/register"
                label="Créer mon carnet gratuit"
                headline={huntLine + '.'}
                note="Rejoins la communauté et crée ton carnet de pêche gratuit."
              />
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

              {/* ⚠️ Sprint 87 : ce bloc vendait /tarifs, donc un ABONNEMENT, à un
                  lecteur qui n'a pas encore de compte. C'est l'anti-motif corrigé
                  au sprint 75 (cf l'en-tête de lib/gating/wall.ts) et il vivait en
                  plus dans une sidebar `hidden lg:block`, invisible aux 82 % de
                  mobile. Remplacé par le même CTA gratuit que le haut de page. */}
              <SeoInlineCta
                template="guide"
                slug={slug}
                position="inline"
                href={ctaHref}
                label={ctaLabel}
                note="Gratuit, sans carte bancaire."
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
