import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronRight, ShieldCheck } from 'lucide-react'
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
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SpeciesScore, SpeciesScoreSkeleton } from '@/components/especes/species-score'
import { SpeciesTopSpots, SpeciesTopSpotsSkeleton } from '@/components/especes/species-top-spots'
import { SpeciesPersonal, SpeciesPersonalSkeleton } from '@/components/especes/species-personal'
import { SpeciesSeasonNow } from '@/components/especes/species-season-now'

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

// Compteur national de prises publiques de l'espèce (30 j) — signal « carte vivante »
// du hero. Les « meilleurs spots » et le score régional décomposé sont chargés par
// leurs propres composants (Suspense), gating et k-anon inclus.
async function fetchCatches30d(dbKey: string): Promise<number> {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { count } = await supabase
    .from('catches_for_viewer')
    .select('id', { count: 'exact', head: true })
    .eq('privacy', 'public')
    .eq('species', dbKey)
    .gte('caught_at', since)
  return count ?? 0
}

const ACTIVITY_DOTS: Record<1 | 2 | 3, { label: string; cls: string }> = {
  1: { label: 'Calme', cls: 'text-ink-500' },
  2: { label: 'Bonne', cls: 'text-gold-500' },
  3: { label: 'Pleine saison', cls: 'text-teal-700' },
}

// Date de vérif réglementaire « 21/06/2026 » (format FR) → « 2026-06-21 » (ISO 8601
// requis par Schema.org pour datePublished/dateModified). Sprint 55 WS-D.
function toIso(fr: string): string {
  const [d, m, y] = fr.split('/')
  return y && m && d ? `${y}-${m}-${d}` : '2026-06-21'
}

export default async function EspecePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!(slug in SPECIES)) notFound()
  const speciesSlug = slug as SpeciesSlug
  const species = SPECIES[speciesSlug]
  const content = ESPECES_CONTENT[speciesSlug]

  const [catches30d, allGuides] = await Promise.all([
    fetchCatches30d(species.dbKey),
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
      datePublished: toIso(content.regulation.verifiedAt),
      dateModified: toIso(content.regulation.verifiedAt),
      image: `${BASE_URL}/especes/${speciesSlug}/opengraph-image`,
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
            {/* ── Score par espèce (l'instrument vivant — sprint 23, WS-B) ─── */}
            <div className="mb-8">
              <Suspense fallback={<SpeciesScoreSkeleton />}>
                <SpeciesScore
                  dbKey={species.dbKey}
                  article={species.article}
                  labelLower={species.labelLower}
                />
              </Suspense>
            </div>

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
                    {content.regulation.minSizeCm['manche-atlantique'] == null &&
                    content.regulation.minSizeCm.mediterranee == null
                      ? 'Pas de maille légale'
                      : `Maille ${formatMaille(content.regulation.minSizeCm)}`}
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
                  Source : {content.regulation.source}. La réglementation évolue. Vérifie
                  l&apos;arrêté en vigueur de ta façade avant de prélever.
                </p>
              </aside>
            </section>

            {/* ── Saisons par façade ──────────────────────────────────── */}
            <section className="mt-10">
              <h2 className="font-display text-xl text-navy-900">Les saisons, façade par façade</h2>
              {/* Créneaux PAR ESPÈCE (D-B3) : la saison en cours, dérivée des saisons. */}
              {facades.length > 0 && (
                <div className="mt-4">
                  <SpeciesSeasonNow
                    saisons={content.saisons}
                    facades={facades}
                    facadeLabels={FACADE_LABELS}
                    speciesDe={`${species.articleDe}${species.labelLower}`}
                  />
                </div>
              )}
              <div className={`mt-4 grid gap-4 ${facades.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {facades.map((f) => (
                  <div key={f} className="rounded-[14px] border border-sand-200 bg-white p-4">
                    <TagData className="mb-3 block">{FACADE_LABELS[f].toUpperCase()}</TagData>
                    {/* Disposition empilée (pas de table) : l'en-tête saison + activité sur
                        une ligne, la note EN DESSOUS en pleine largeur — évite la colonne
                        note écrasée (un mot par ligne) dans la grille 2 façades sur desktop. */}
                    <div className="flex flex-col">
                      {content.saisons[f].map((s) => (
                        <div
                          key={s.saison}
                          className="border-t border-sand-200 py-2.5 first:border-t-0 first:pt-0"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                            <span className="font-mono text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-500">
                              {s.saison}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-semibold uppercase tracking-[0.04em] ${ACTIVITY_DOTS[s.activite].cls}`}
                            >
                              {'●'.repeat(s.activite)}
                              {'○'.repeat(3 - s.activite)} {ACTIVITY_DOTS[s.activite].label}
                            </span>
                          </div>
                          <p className="mt-1 text-[13.5px] leading-snug text-ink-700">{s.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Techniques ──────────────────────────────────────────── */}
            <section className="mt-10">
              <h2 className="font-display text-xl text-navy-900">
                Comment {species.gender === 'f' ? 'la' : 'le'} pêcher du bord
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
                la houle, de quoi choisir ton poste avant de charger la voiture.
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

            {/* ── Maillage : autres espèces du bord (SEO interne — WS-C) ──── */}
            <section className="mt-10">
              <h2 className="font-display text-xl text-navy-900">Autres espèces du bord</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {(() => {
                  // Fenêtre tournante à partir de l'espèce courante → le maillage couvre
                  // tout le référentiel (pas toujours les 9 premières dans l'ordre).
                  const all = Object.keys(SPECIES) as SpeciesSlug[]
                  const i = all.indexOf(speciesSlug)
                  return [...all.slice(i + 1), ...all.slice(0, i)].slice(0, 9)
                })().map((s) => (
                    <Link
                      key={s}
                      href={`/especes/${s}`}
                      className="rounded-full border border-sand-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink-600 transition-colors hover:border-teal-500/40 hover:text-navy-900"
                    >
                      {SPECIES[s].label}
                    </Link>
                  ))}
              </div>
            </section>
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="mt-10 lg:mt-0">
            <div className="flex flex-col gap-5 lg:sticky lg:top-8">
              {/* Meilleurs spots pour l'espèce (triés par signal réel — RPC 049) */}
              <Suspense fallback={<SpeciesTopSpotsSkeleton />}>
                <SpeciesTopSpots dbKey={species.dbKey} label={species.label} />
              </Suspense>

              {/* Tes tendances sur cette espèce (moteur perso unifié sprint 22) */}
              <Suspense fallback={<SpeciesPersonalSkeleton />}>
                <SpeciesPersonal dbKey={species.dbKey} labelLower={species.labelLower} />
              </Suspense>

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
