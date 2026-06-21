import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronRight, MapPin, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  SPECIES,
  TECHNIQUES,
  programmaticUrl,
  type SpeciesSlug,
  type Facade,
} from '@/lib/seo/programmatic'
import { ESPECES_CONTENT } from '@/lib/especes/content'
import { getAllGuides } from '@/lib/guides/loader'
import { STRUCTURE_LABELS } from '@/lib/labels'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const revalidate = 86400
export const dynamicParams = false

const BASE_URL = 'https://www.carnet-de-peche.com'

const FACADE_LABELS: Record<Facade, string> = {
  'manche-atlantique': 'Manche · Atlantique',
  mediterranee: 'Méditerranée',
}

/** Format compact de la maille (donnée structurée) pour le badge mono. */
function formatMaille(minSize: Record<Facade, number | null>): string {
  const atl = minSize['manche-atlantique']
  const med = minSize.mediterranee
  if (atl != null && med != null) {
    return atl === med ? `${atl} cm` : `${atl} cm (Manche/Atl.) · ${med} cm (Médit.)`
  }
  if (atl != null) return `${atl} cm (Manche/Atl.)`
  if (med != null) return `${med} cm (Médit.)`
  return '—'
}

export async function generateStaticParams() {
  return (Object.keys(SPECIES) as SpeciesSlug[]).map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (!(slug in SPECIES)) return { title: 'Espèce introuvable — Carnet de Pêche' }
  const species = SPECIES[slug as SpeciesSlug]
  const canonical = `${BASE_URL}/especes/${slug}`
  const title = `${species.label} (${species.latin}) : pêche du bord, saisons, taille légale`
  const description = `La fiche complète ${species.articleDe}${species.labelLower} pour la canne du bord : taille légale vérifiée, saisons par façade, techniques, postes selon les conditions, prises récentes de la communauté.`
  return {
    title: `${title} · Carnet de Pêche`,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'article', locale: 'fr_FR' },
  }
}

async function fetchLive(slug: SpeciesSlug) {
  const supabase = await createClient()
  const dbKey = SPECIES[slug].dbKey
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const { data: spotRows } = await supabase
    .from('spots')
    .select('id, slug, name, structure, department')
    .eq('visibility', 'public')
    .contains('species', [dbKey])

  const spots = (spotRows ?? []).slice(0, 4)
  let catches30d = 0
  if ((spotRows ?? []).length > 0) {
    const { count } = await supabase
      .from('catches_for_viewer')
      .select('id', { count: 'exact', head: true })
      .eq('privacy', 'public')
      .eq('species', dbKey)
      .gte('caught_at', since)
    catches30d = count ?? 0
  }
  return { spots, catches30d }
}

const ACTIVITY_DOTS: Record<1 | 2 | 3, { label: string; cls: string }> = {
  1: { label: 'Calme', cls: 'text-ink-500' },
  2: { label: 'Bonne', cls: 'text-gold-500' },
  3: { label: 'Pleine saison', cls: 'text-teal-700' },
}

export default async function EspecePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!(slug in SPECIES)) notFound()
  const speciesSlug = slug as SpeciesSlug
  const species = SPECIES[speciesSlug]
  const content = ESPECES_CONTENT[speciesSlug]

  const [{ spots, catches30d }, allGuides] = await Promise.all([
    fetchLive(speciesSlug),
    getAllGuides().catch(() => []),
  ])
  const relatedGuides = allGuides
    .filter((g) => g.species === species.label || g.species === 'Multi-espèces')
    .slice(0, 3)

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${species.label} : pêche du bord, saisons, taille légale`,
      description: content.intro[0],
      author: { '@type': 'Organization', name: 'Carnet de Pêche' },
      publisher: { '@type': 'Organization', name: 'Carnet de Pêche', url: BASE_URL },
      mainEntityOfPage: `${BASE_URL}/especes/${speciesSlug}`,
      inLanguage: 'fr',
      dateModified: '2026-06-12',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Espèces', item: `${BASE_URL}/especes` },
        {
          '@type': 'ListItem',
          position: 3,
          name: species.label,
          item: `${BASE_URL}/especes/${speciesSlug}`,
        },
      ],
    },
    ...(content.faq.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: content.faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        ]
      : []),
  ]

  const facades = (Object.keys(content.saisons) as Facade[]).filter(
    (f) => content.saisons[f].length > 0,
  )

  return (
    <div className="bg-sand-50 min-h-screen">
      {jsonLd.map((x, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }}
        />
      ))}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy-950 pt-10 pb-12">
        <Bathy opacity={0.3} withLabels />
        <div className="relative mx-auto max-w-[980px] px-5">
          <nav className="mb-6 flex items-center gap-2" aria-label="Fil d'ariane">
            <Link
              href="/especes"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-teal-300 hover:text-white transition-colors"
            >
              Espèces
            </Link>
            <ChevronRight size={12} className="text-white/30" />
            <TagData className="text-white/45">{species.label.toUpperCase()}</TagData>
          </nav>
          <h1 className="font-display text-white">
            {species.article}{species.labelLower}{' '}
            <span className="text-[0.55em] font-normal italic text-white/40">{species.latin}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">{content.intro[0]}</p>

          {/* Carte d'identité mono */}
          <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {[
              ['TAILLE COURANTE', content.identity.tailleCourante],
              ['TAILLE MAX', content.identity.tailleMax],
              ['HABITAT', content.identity.habitat],
              ['RÉGIME', content.identity.regime],
            ].map(([label, value]) => (
              <div key={label}>
                <TagData className="block text-white/40">{label}</TagData>
                <p className="mt-0.5 font-mono text-[13px] font-medium text-teal-300">{value}</p>
              </div>
            ))}
          </div>
          {catches30d > 0 && (
            <TagData variant="on-dark" className="mt-6 block">
              ● {catches30d} PRISE{catches30d > 1 ? 'S' : ''} LOGUÉE{catches30d > 1 ? 'S' : ''} CES
              30 DERNIERS JOURS SUR LA CARTE
            </TagData>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[980px] px-5 py-10">
        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-12">
          <div className="min-w-0">
            {/* ── Portrait ────────────────────────────────────────────── */}
            <section className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-navy-900 prose-p:text-ink-700 prose-strong:text-navy-900">
              {content.intro.slice(1).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>

            {/* ── Réglementation (LA différence vs Fishing Grid) ─────────── */}
            <section className="mt-8">
              <h2 className="font-display text-xl text-navy-900">
                Taille légale et réglementation
              </h2>
              <aside className="mt-4 rounded-[14px] border border-gold-500/35 bg-gold-500/[0.07] p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#A87C20]">
                    <ShieldCheck size={14} strokeWidth={1.7} />
                    {species.label} · pêche de loisir
                  </span>
                </div>

                {/* Badge maille (donnée structurée, mono — DA v2) */}
                <div className="mb-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-[10px] border border-gold-500/25 bg-white/60 px-3.5 py-2.5">
                  <span className="font-mono text-xl font-bold leading-none text-navy-900">
                    Maille {formatMaille(content.regulation.minSizeCm)}
                  </span>
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-500">
                    · vérifié le {content.regulation.verifiedAt} · Légifrance
                  </span>
                  {content.regulation.marquage && (
                    <span className="rounded-full bg-navy-900 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-white">
                      Marquage obligatoire
                    </span>
                  )}
                </div>

                <ul className="flex flex-col gap-2 text-[14px] leading-relaxed text-ink-700">
                  {content.regulation.items.map((item, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span
                        className="mt-[7px] size-1.5 shrink-0 rounded-full bg-gold-500"
                        aria-hidden="true"
                      />
                      <span dangerouslySetInnerHTML={{ __html: item }} />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-gold-500/20 pt-3 text-[12px] leading-snug text-ink-500">
                  Source : {content.regulation.source}. La réglementation évolue — vérifie
                  l&apos;arrêté en vigueur de ta façade avant de prélever.
                </p>
              </aside>
            </section>

            {/* ── Saisons par façade ──────────────────────────────────── */}
            <section className="mt-10">
              <h2 className="font-display text-xl text-navy-900">Les saisons, façade par façade</h2>
              <div className={`mt-4 grid gap-4 ${facades.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {facades.map((f) => (
                  <div key={f} className="rounded-[14px] border border-sand-200 bg-white p-4">
                    <TagData className="mb-3 block">{FACADE_LABELS[f].toUpperCase()}</TagData>
                    <table className="w-full text-[13.5px]">
                      <tbody>
                        {content.saisons[f].map((s) => (
                          <tr key={s.saison} className="border-t border-sand-200 first:border-t-0">
                            <td className="py-2 pr-3 align-top font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-500 whitespace-nowrap">
                              {s.saison}
                            </td>
                            <td className="py-2 pr-3 align-top whitespace-nowrap">
                              <span
                                className={`font-mono text-[11px] font-semibold uppercase tracking-[0.04em] ${ACTIVITY_DOTS[s.activite].cls}`}
                              >
                                {'●'.repeat(s.activite)}
                                {'○'.repeat(3 - s.activite)} {ACTIVITY_DOTS[s.activite].label}
                              </span>
                            </td>
                            <td className="py-2 align-top leading-snug text-ink-700">{s.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Techniques ──────────────────────────────────────────── */}
            <section className="mt-10">
              <h2 className="font-display text-xl text-navy-900">
                Comment le pêcher du bord
              </h2>
              <div className="mt-4 flex flex-col gap-2.5">
                {content.techniques.map((t) => (
                  <Link
                    key={t.slug}
                    href={programmaticUrl({ species: speciesSlug, technique: t.slug, deptCode: null })}
                    className="group flex items-start gap-3.5 rounded-[14px] border border-sand-200 bg-white p-4 transition-colors hover:border-teal-500/40"
                  >
                    <span className="mt-0.5 shrink-0 rounded-full border border-navy-900 bg-navy-900 px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-white">
                      {TECHNIQUES[t.slug].label}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink-700">
                      {t.why}
                    </span>
                    <ArrowRight
                      size={15}
                      className="mt-1 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600"
                    />
                  </Link>
                ))}
              </div>
            </section>

            {/* ── Postes & conditions ─────────────────────────────────── */}
            <section className="prose prose-slate mt-10 max-w-none prose-headings:font-display prose-headings:text-navy-900 prose-p:text-ink-700 prose-strong:text-navy-900">
              <h2 className="!text-xl">Où se poster selon les conditions</h2>
              {content.postes.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <p>
                Chaque fiche spot de{' '}
                <Link href="/carte">la carte</Link> affiche la courbe de marée du jour, le vent et
                la houle — de quoi choisir ton poste avant de charger la voiture.
              </p>
            </section>

            {/* ── FAQ ─────────────────────────────────────────────────── */}
            {content.faq.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-xl text-navy-900">Questions fréquentes</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {content.faq.map((f) => (
                    <details
                      key={f.q}
                      className="group rounded-[14px] border border-sand-200 bg-white p-4"
                    >
                      <summary className="cursor-pointer list-none text-[14.5px] font-semibold text-navy-900 marker:hidden">
                        {f.q}
                      </summary>
                      <p className="mt-2 text-[14px] leading-relaxed text-ink-700">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="mt-10 lg:mt-0">
            <div className="flex flex-col gap-5 lg:sticky lg:top-8">
              {spots.length > 0 && (
                <div className="rounded-[18px] border border-sand-200 bg-white p-5">
                  <TagData className="mb-3 block">SPOTS À {species.label.toUpperCase()}</TagData>
                  <ul className="flex flex-col gap-2.5">
                    {spots.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={`/spots/${s.slug}`}
                          className="group flex items-center gap-2.5"
                        >
                          <MapPin size={14} className="shrink-0 text-teal-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-navy-900 group-hover:text-teal-700">
                              {s.name}
                            </span>
                            <TagData className="block">
                              {String(s.department).trim()}
                              {s.structure
                                ? ` · ${(STRUCTURE_LABELS[s.structure] ?? s.structure).toUpperCase()}`
                                : ''}
                            </TagData>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedGuides.length > 0 && (
                <div className="rounded-[18px] border border-sand-200 bg-white p-5">
                  <TagData className="mb-3 block">GUIDES LIÉS</TagData>
                  <ul className="flex flex-col gap-2.5">
                    {relatedGuides.map((g) => (
                      <li key={g.slug}>
                        <Link
                          href={`/guides/${g.slug}`}
                          className="text-[13.5px] font-medium leading-snug text-navy-900 hover:text-teal-700"
                        >
                          {g.title} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="relative overflow-hidden rounded-[18px] bg-navy-950 p-5 text-center">
                <Bathy density={2} opacity={0.3} />
                <div className="relative">
                  <p className="text-sm font-semibold text-white">
                    Tes prises {species.articleDe}{species.labelLower}, tes patterns
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                    Logue tes sorties : le carnet apprend quand et où TU le prends.
                  </p>
                  <Link
                    href="/auth/register"
                    className={cn(
                      buttonVariants({ variant: 'accent', size: 'cta-sm' }),
                      'mt-4 w-full',
                    )}
                  >
                    Créer mon carnet gratuit
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
