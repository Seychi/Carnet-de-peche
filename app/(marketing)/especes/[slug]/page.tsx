import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronRight, ShieldCheck } from 'lucide-react'
import { createAnonClient } from '@/lib/supabase/anon'
import {
  SPECIES,
  TECHNIQUES,
  programmaticUrl,
  resolveProgrammaticSlug,
  type SpeciesSlug,
  type Facade,
} from '@/lib/seo/programmatic'
import { ESPECES_CONTENT } from '@/lib/especes/content'
import { buildSpeciesTitle, buildSpeciesDescription } from '@/lib/especes/seo'
import { getAllGuides } from '@/lib/guides/loader'
import { relatedGuidesFor } from '@/lib/guides/related'
import { Bathy } from '@/components/ui-v2/bathy'
import { TagData } from '@/components/ui-v2/tag-data'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SpeciesScore, SpeciesScoreSkeleton } from '@/components/especes/species-score'
import { SpeciesTopSpots } from '@/components/especes/species-top-spots'
import { SpeciesPersonal, SpeciesPersonalSkeleton } from '@/components/especes/species-personal'
import { SpeciesSeasonNow } from '@/components/especes/species-season-now'
import { SpeciesAnswer } from '@/components/especes/species-answer'
import { POSTES_PUCES } from '@/lib/especes/postes-puces'
import { SpeciesCtaLink } from '@/components/especes/tracked-links'
import { SpeciesSeasons } from '@/components/especes/species-seasons'
import { RECFISHING_SENSITIVE } from '@/lib/regulation/recfishing'

// Espèces de NOTRE carnet soumises à déclaration RecFishing sous 24 h (source
// unique : lib/regulation/recfishing) → cross-link honnête vers la landing wedge.
const DECLARABLE_SLUGS = new Set<string>(RECFISHING_SENSITIVE.flatMap((s) => s.matchSlugs))

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
  // Sprint 75 Bloc 4 : le title et la description portent désormais la DONNÉE
  // ACTIONNABLE (maille, marquage, saison en cours) au lieu de décrire le site.
  // Constat GSC 90 j : /especes = 36 % des impressions pour 11 % des clics. Les
  // requêtes qui cliquent sont « maille du maigre 2026 », « bar maille » : on leur
  // répond dans le SERP. Construction PURE et dégradante (lib/especes/seo.ts) :
  // rien n'est inventé, une espèce sans maille retombe sur l'intention pêche.
  const seoInput = { meta: species, content: ESPECES_CONTENT[slug as SpeciesSlug] }
  const title = buildSpeciesTitle(seoInput)
  const description = buildSpeciesDescription(seoInput)
  // Le nom latin reste dans l'OG et le H1 : il porte la reconnaissance de l'espèce
  // sans coûter les caractères du <title>, qui sert l'intention pêche.
  const ogTitle = `${species.label} (${species.latin}) : pêche du bord`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: ogTitle, description, url: canonical, type: 'article', locale: 'fr_FR' },
  }
}

// Compteur national de prises publiques de l'espèce (30 j) — signal « carte vivante »
// du hero. Les « meilleurs spots » et le score régional décomposé sont chargés par
// leurs propres composants, gating et k-anon inclus.
//
// Client ANON sans cookies (sprint 84) : le filtre `privacy = 'public'` rend ce compte
// rigoureusement indépendant du visiteur. `catches_for_viewer` est une vue SECURITY
// DEFINER dont le WHERE est
// `user_id = auth.uid() OR privacy = 'public' OR (friends AND follow)` : ce qu'elle
// accorde EN PLUS à un connecté (ses prises, celles de ses suivis) est exclu par ce
// filtre. Vérifié en base le 17/08 : même compte pour `anon` et pour un compte
// possédant 6 prises non publiques.
async function fetchCatches30d(dbKey: string): Promise<number> {
  const supabase = createAnonClient()
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { count } = await supabase
    .from('catches_for_viewer')
    .select('id', { count: 'exact', head: true })
    .eq('privacy', 'public')
    .eq('species', dbKey)
    .gte('caught_at', since)
  return count ?? 0
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
  // Sprint 75 Bloc 4 : les guides DÉDIÉS à l'espèce passent devant les
  // multi-espèces, même s'ils sont plus anciens (lib/guides/related).
  const relatedGuides = relatedGuidesFor(allGuides, [species.label])

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
          {/* Sprint 75 Bloc 2 : LA RÉPONSE D'ABORD. Maille, statut du jour et quota
              remontent au-dessus de l'intro, sinon ils sont hors écran en 390 px
              (82 % du trafic). La prose de fond reste juste en dessous, intacte. */}
          <SpeciesAnswer
            slug={speciesSlug}
            facades={facades}
            minSizeCm={content.regulation.minSizeCm}
            verifiedAt={content.regulation.verifiedAt}
            source={content.regulation.source}
            marquage={content.regulation.marquage}
          />

          {/* CTA contextuel PRÉCOCE (sprint 75 Bloc 2) : relié à ce qu'on vient de
              lire, pas un bandeau publicitaire. L'ancien CTA était ligne 478 sur
              494, donc jamais atteint sur mobile. Le CTA final reste en place.
              Un seul href pour les deux publics : le middleware renvoie les
              déconnectés vers /auth/login?redirect=/carnet/nouvelle. */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <SpeciesCtaLink
              species={speciesSlug}
              position="inline"
              href="/carnet/nouvelle"
              className="inline-flex min-h-11 items-center rounded-xl bg-teal-500 px-4 text-[13.5px] font-semibold text-navy-950 transition-colors hover:bg-teal-400"
            >
              Loguer une prise {species.articleDe}{species.labelLower}
            </SpeciesCtaLink>
            <span className="text-[12.5px] leading-snug text-white/45">
              Gratuit. Ton carnet te dira quand tes prises tombent.
            </span>
          </div>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/60">{content.intro[0]}</p>

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

      {/* ── Où pêcher (sprint 77 Bloc 9) ────────────────────────────────
          Remonté depuis la sidebar : sur les pages à intention d'identification
          (« congre poisson », « mulet poisson »…), le visiteur cherchait le geste
          suivant bien avant d'atteindre le bas de fiche, où vivait ce bloc jusque-là
          (invisible en 390 px, sous tout le corps éditorial). Composant INCHANGÉ
          (`SpeciesTopSpots`, sprint 23/75) : seule sa position bouge. Server
          Component sous Suspense → streamé dans le HTML servi, jamais monté au clic
          (cf lib/especes/top-spots.ts : signal réel RPC 049, spots approuvés
          uniquement depuis la migration 109). Retiré de la sidebar plus bas pour ne
          pas dupliquer le bloc ni son JSON-LD ItemList. */}
      {/* ⚠️ SPRINT 78 — LE `<Suspense>` A ÉTÉ RETIRÉ ICI, ET C'EST LE POINT.
          Déplacer le JSX au sprint 77 n'a pas suffi : mesuré sur la PRODUCTION le
          15/08, « OÙ PÊCHER BAR » se trouvait à l'offset 160169 du HTML servi,
          quand la FAQ était à 44207 et « Autres espèces » à 46790. Le bloc restait
          donc le DERNIER du document, c'est-à-dire exactement ce que le sprint 77
          voulait corriger, et l'audit du 14/08 l'avait vu.
          Cause : une frontière Suspense émet son contenu à la FIN du flux, et c'est
          le client qui le remet en place. L'humain voyait le bloc au bon endroit,
          le document servi non.
          Or cette page est ENTIÈREMENT STATIQUE (`generateStaticParams` +
          `revalidate = 86400` + `dynamicParams = false`) : le HTML est produit une
          fois puis servi 24 h. Le Suspense n'achetait aucune latence, il ne coûtait
          que l'ordre du document. On rend donc le composant en ligne.
          Même famille de piège que le sprint 77 : ce que le serveur ÉMET compte
          plus que ce que le JSX suggère. */}
      <div className="mx-auto max-w-[980px] px-5 pt-8">
        <SpeciesTopSpots dbKey={species.dbKey} label={species.label} speciesSlug={speciesSlug} />
      </div>

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
                {DECLARABLE_SLUGS.has(speciesSlug) && (
                  <p className="mt-3 border-t border-gold-500/20 pt-3 text-[12px] leading-snug text-ink-600">
                    Espèce sensible : chaque prise ({species.articleDe}{species.labelLower}) est à
                    déclarer sous 24 h via RecFishing, même relâchée.{' '}
                    <Link
                      href="/declarer-ses-prises"
                      className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-800"
                    >
                      Comment déclarer ses prises en mer
                    </Link>
                    .
                  </p>
                )}
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
              {/* Sprint 75 Bloc 2 : 8 blocs de prose (4 saisons × 2 façades) → une
                  frise de 4 lignes, saison en cours mise en avant, notes au
                  dépliement mais TOUJOURS dans le HTML servi (<details> natif). */}
              <SpeciesSeasons
                saisons={content.saisons}
                facades={facades}
                facadeLabels={FACADE_LABELS}
              />
            </section>

            {/* ── Techniques ──────────────────────────────────────────── */}
            <section className="mt-10">
              <h2 className="font-display text-xl text-navy-900">
                Comment {species.gender === 'f' ? 'la' : 'le'} pêcher du bord
              </h2>
              {/*
                ⚠️ Sprint 83 : ce bloc émettait un lien /peche pour CHAQUE technique de
                la fiche profonde, sans jamais demander à `resolveProgrammaticSlug` si la
                page existe. Résultat mesuré avant correctif : 56 liens émis sur les 26
                fiches, dont 30 en 404 DUR (les espèces hors `SPECIES_TECHNIQUES` : la
                route fait `notFound()`). `/especes/mulet` en émettait 2, et c'est
                justement la page que le Bloc 5 va faire cliquer (283 impressions sur
                l'intention maille). On ne lie donc que ce qui se résout, et on rend une
                carte NON cliquable sinon : le conseil technique garde toute sa valeur,
                seul le lien mort disparaît.
              */}
              <div className="mt-4 flex flex-col gap-2.5">
                {content.techniques.map((t) => {
                  const target = resolveProgrammaticSlug([speciesSlug, t.slug])
                  const inner = (
                    <>
                      <span className="mt-0.5 shrink-0 rounded-full border border-navy-900 bg-navy-900 px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-white">
                        {TECHNIQUES[t.slug].label}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink-700">
                        {t.why}
                      </span>
                      {target && (
                        <ArrowRight
                          size={15}
                          className="mt-1 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600"
                        />
                      )}
                    </>
                  )
                  const shell =
                    'group flex items-start gap-3.5 rounded-[14px] border border-sand-200 bg-white p-4'

                  return target ? (
                    <Link
                      key={t.slug}
                      href={programmaticUrl(target)}
                      className={`${shell} transition-colors hover:border-teal-500/40`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={t.slug} className={shell}>
                      {inner}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Postes & conditions ─────────────────────────────────── */}
            <section className="prose prose-slate mt-10 max-w-none prose-headings:font-display prose-headings:text-navy-900 prose-p:text-ink-700 prose-strong:text-navy-900">
              <h2 className="!text-xl">Où se poster selon les conditions</h2>

              {/* Sprint 75 Bloc 2 : 3 paragraphes de prose → puces concrètes. Chaque
                  puce est la CONDENSATION d'une phrase existante de la fiche, jamais
                  un fait ajouté (lib/especes/postes-puces.ts). Règle d'élagage : une
                  phrase vraie pour n'importe quelle espèce dégage ; on garde les
                  chiffres, les seuils et les postes nommés. */}
              <ul className="not-prose mt-4 flex flex-col gap-2.5">
                {POSTES_PUCES[speciesSlug].map((b) => (
                  <li key={b.label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                    <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-700 sm:w-24 sm:pt-0.5">
                      {b.label}
                    </span>
                    <span className="text-[14.5px] leading-relaxed text-ink-700">{b.text}</span>
                  </li>
                ))}
              </ul>

              {/* La prose d'origine reste DANS LE HTML SERVI (<details> natif, pas un
                  montage au clic) : elle porte le référencement, on la hiérarchise
                  sans jamais la retirer de l'index. */}
              <details className="not-prose mt-5 rounded-[14px] border border-sand-200 bg-white px-4 py-3">
                <summary className="cursor-pointer text-[13.5px] font-semibold text-navy-900">
                  Le détail, en texte
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {content.postes.map((p, i) => (
                    <p key={i} className="text-[14.5px] leading-relaxed text-ink-700">
                      {p}
                    </p>
                  ))}
                </div>
              </details>
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
              {/* « Où pêcher » remonté en tête de fiche (sprint 77 Bloc 9, cf plus
                  haut, juste sous le hero) : plus rendu ici pour ne pas le dupliquer. */}

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
