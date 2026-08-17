import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronRight, MapPin } from 'lucide-react'
import { createAnonClient } from '@/lib/supabase/anon'
import {
  getAllProgrammaticPages,
  resolveProgrammaticSlug,
  programmaticUrl,
  programmaticTitle,
  deptPreposition,
  SPECIES,
  TECHNIQUES,
  DEPARTMENT_SLUGS,
  facadeOf,
  type ProgrammaticPage,
} from '@/lib/seo/programmatic'
import { SPECIES_CONTENT } from '@/lib/seo/content'
import { getAllGuides } from '@/lib/guides/loader'
import { DEPARTMENT_LABELS, COASTAL_DEPARTMENTS } from '@/lib/geo/departments'
import { STRUCTURE_LABELS } from '@/lib/labels'
import { Bathy } from '@/components/ui-v2/bathy'
import { SeoTitle } from '@/components/seo/seo-title'
import { KeyFacts } from '@/components/seo/key-facts'
import { SeoInlineCta } from '@/components/seo/seo-inline-cta'
import { shortSpotName } from '@/lib/seo/spot-title'
import { TagData } from '@/components/ui-v2/tag-data'

// ISR quotidien — les stats live (prises 30j, spots) se rafraîchissent chaque jour.
export const revalidate = 86400
export const dynamicParams = true

const BASE_URL = 'https://www.carnet-de-peche.com'

// generateStaticParams paresseux (brief Bloc 2) : seules les ~15 pages
// nationales sont pré-rendues au build ; les ~330 pages départementales
// se génèrent à la première visite puis restent en cache ISR.
export async function generateStaticParams() {
  return getAllProgrammaticPages()
    .filter((p) => p.deptCode === null)
    .map((p) => ({ slug: [p.species, p.technique] }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = resolveProgrammaticSlug(slug)
  if (!page) return { title: 'Page introuvable — Carnet de Pêche' }

  const title = programmaticTitle(page)
  const species = SPECIES[page.species]
  const technique = TECHNIQUES[page.technique]
  const where = page.deptCode
    ? `${deptPreposition(page.deptCode)}${DEPARTMENT_LABELS[page.deptCode]}`
    : 'en France'
  const description = `Où et comment pêcher ${species.article.toLowerCase()}${species.labelLower} ${technique.withArticle} ${where} : spots, saisons, marées favorables et conseils de pêcheurs du bord.`
  const canonical = `${BASE_URL}${programmaticUrl(page)}`
  // OG servie par le route handler /og/peche/[...slug] (sprint 70) : la
  // convention `opengraph-image.tsx` dans un segment catch-all cassait le
  // route matcher de Next (« Catch-all must be the last part of the URL »).
  const ogImage = `${BASE_URL}/og${programmaticUrl(page)}`

  return {
    title: `${title} · Carnet de Pêche`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      locale: 'fr_FR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', images: [ogImage] },
  }
}

// ─── Données live ─────────────────────────────────────────────────────────────

type SpotLite = {
  id: string
  slug: string
  name: string
  structure: string | null
  species: string[]
}

// Lecture ANONYME assumée (sprint 84) : cette page est mise en cache, donc son HTML
// est servi à tout le monde. Elle doit se rendre exactement comme pour un visiteur
// sans compte, et c'est aussi ce qui lui rend son ISR (le client de session lisait
// les cookies et la rendait dynamique malgré `revalidate = 86400`).
//
// Les deux lectures sont publiques par nature et l'anonymat ne change pas le résultat :
//   - `spots` filtré `visibility = 'public'` : la policy `spots_select_visible` n'ouvre
//     au-delà que pour `created_by = auth.uid()` et `is_moderator()`. Rendre la page
//     avec une session de MODÉRATEUR y injectait les spots encore `pending` et figeait
//     ce surplus dans le cache ISR pour tous. Mesuré le 17/08 sur `bar` : 413 spots vus
//     par `anon` contre 423 par le modérateur. C'est la vue anonyme qui est la bonne.
//   - `catches_for_viewer` filtré `privacy = 'public'` : la vue (SECURITY DEFINER) ne
//     donne en plus à un connecté que SES prises et celles de ses suivis, or le filtre
//     `privacy = 'public'` les exclut déjà. Vérifié en base : même compte pour `anon` et
//     pour un compte possédant 6 prises non publiques.
async function fetchData(page: ProgrammaticPage): Promise<{
  spots: SpotLite[]
  catches30d: number
  deptsWithSpots: string[]
}> {
  const supabase = createAnonClient()
  const dbKey = SPECIES[page.species].dbKey
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  let query = supabase
    .from('spots')
    .select('id, slug, name, structure, species, department')
    .eq('visibility', 'public')
    .contains('species', [dbKey])
  if (page.deptCode) query = query.eq('department', page.deptCode)

  const { data: spotRows } = await query
  const spots = ((spotRows ?? []) as (SpotLite & { department: string })[]).slice(0, 5)
  const deptsWithSpots = [
    ...new Set(((spotRows ?? []) as { department: string }[]).map((s) => s.department.trim())),
  ]

  let catches30d = 0
  if ((spotRows ?? []).length > 0) {
    const ids = (spotRows ?? []).map((s) => (s as { id: string }).id)
    const { count } = await supabase
      .from('catches_for_viewer')
      .select('id', { count: 'exact', head: true })
      .eq('privacy', 'public')
      .eq('species', dbKey)
      .gte('caught_at', since)
      .in('spot_id', ids.slice(0, 100))
    catches30d = count ?? 0
  }

  return { spots, catches30d, deptsWithSpots }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProgrammaticPageView({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const page = resolveProgrammaticSlug(slug)
  if (!page) notFound()

  const species = SPECIES[page.species]
  const technique = TECHNIQUES[page.technique]
  const content = SPECIES_CONTENT[page.species]
  // resolveProgrammaticSlug ne renvoie une page que pour les espèces à contenu
  // programmatique (SPECIES_TECHNIQUES) → content est toujours présent ici. Garde
  // défensive depuis le passage en Partial (sprint 23).
  if (!content) notFound()
  const techContent = content.techniques[page.technique]
  const deptLabel = page.deptCode ? DEPARTMENT_LABELS[page.deptCode] : null
  const title = programmaticTitle(page)

  const [{ spots, catches30d, deptsWithSpots }, allGuides] = await Promise.all([
    fetchData(page),
    getAllGuides().catch(() => []),
  ])

  // Guides liés : technique identique d'abord, puis espèce.
  const relatedGuides = allGuides
    .filter((g) => g.technique === technique.dbKey || g.species === species.label)
    .slice(0, 2)

  // Maillage : autres techniques de l'espèce + départements voisins avec spots.
  const otherTechniques = getAllProgrammaticPages()
    .filter((p) => p.species === page.species && p.deptCode === page.deptCode && p.technique !== page.technique)
    .filter((p, i, arr) => arr.findIndex((q) => q.technique === p.technique) === i)
  const deptLinks = page.deptCode
    ? // page départementale → départements voisins (avec spots en priorité)
      COASTAL_DEPARTMENTS.filter(
        (d) => d !== page.deptCode && resolveProgrammaticSlug([page.species, page.technique, DEPARTMENT_SLUGS[d]]),
      )
        .sort((a, b) => Number(deptsWithSpots.includes(b)) - Number(deptsWithSpots.includes(a)))
        .slice(0, 8)
    : // page nationale → départements qui ONT une page ET des spots.
      //
      // ⚠️ Sprint 83, Bloc 4 : deux liens morts vivaient ici. `deptsWithSpots`
      // sort de la BASE et ignore complètement la matrice : la page nationale du
      // sar liait le Morbihan (7 spots réels) alors que /peche/sar/<technique>/
      // morbihan n'existe pas, donc 404. Et le repli codé en dur sur la Bretagne
      // envoyait toute espèce méditerranéenne sur 4 liens morts. On part donc des
      // départements réellement ouverts, et les spots ne servent qu'à prioriser.
      (() => {
        const ouverts = COASTAL_DEPARTMENTS.filter((d) =>
          resolveProgrammaticSlug([page.species, page.technique, DEPARTMENT_SLUGS[d]]),
        )
        const avecSpots = ouverts.filter((d) => deptsWithSpots.includes(d))
        return (avecSpots.length > 0 ? avecSpots : ouverts).slice(0, 8)
      })()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: BASE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: `Pêche ${species.articleDe}${species.labelLower}`,
        item: `${BASE_URL}/peche/${page.species}/${page.technique}`,
      },
      ...(page.deptCode
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: deptLabel,
              item: `${BASE_URL}${programmaticUrl(page)}`,
            },
          ]
        : []),
    ],
  }

  return (
    <div className="bg-sand-50 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy-950 pt-7 pb-8 sm:pt-10 sm:pb-11">
        <Bathy opacity={0.3} />
        <div className="relative mx-auto max-w-[860px] px-5">
          <nav className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5" aria-label="Fil d'ariane">
            <Link
              href="/guides"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-teal-300 hover:text-white transition-colors"
            >
              Guides
            </Link>
            <ChevronRight size={12} className="text-white/30" />
            <TagData className="text-white/45">{species.label.toUpperCase()}</TagData>
            <ChevronRight size={12} className="text-white/30" />
            <TagData className="text-white/45">{technique.label.toUpperCase()}</TagData>
            {deptLabel && (
              <>
                <ChevronRight size={12} className="text-white/30" />
                <TagData className="text-white/45">
                  {deptLabel.toUpperCase()} · {page.deptCode}
                </TagData>
              </>
            )}
          </nav>
          {/* Sprint 87 Bloc 1 : le titre passe par la primitive partagée, qui
              porte le clamp réduit et `data-fold="title"`. Le h1 global
              (clamp 32→72px) reste intact pour la home et les index. */}
          <SeoTitle>{title}</SeoTitle>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/60 sm:mt-4 sm:text-lg">
            {species.label} <em className="text-white/40">({species.latin})</em>{' '}
            {technique.withArticle}, vu du bord : les postes, les saisons, les marées qui comptent.
          </p>
          {catches30d > 0 && (
            <TagData variant="on-dark" className="mt-4 block">
              ● {catches30d} PRISE{catches30d > 1 ? 'S' : ''} DE {species.label.toUpperCase()} LOGUÉE
              {catches30d > 1 ? 'S' : ''} CES 30 DERNIERS JOURS
              {deptLabel ? ` · ${deptLabel.toUpperCase()}` : ' · FRANCE'}
            </TagData>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[860px] px-5 pt-6 pb-10">
        {/* ── L'essentiel ─────────────────────────────────────────────────
            Sprint 87 Bloc 2 : le bloc vivait en `not-prose` ENTRE les
            paragraphes de technique, donc sous le premier écran en mobile.
            C'est pourtant LUI la réponse à la requête qui a amené le visiteur ;
            la prose est le « pour creuser ». Il remonte, sans être redessiné. */}
        {techContent && (
          <KeyFacts
            label={`L'ESSENTIEL · ${technique.label.toUpperCase()}`}
            items={techContent.bullets}
            footnote={
              <>
                <strong className="text-navy-900">Quand :</strong> {techContent.seasonNote}
              </>
            }
          />
        )}

        {/* ── CTA précoce ─────────────────────────────────────────────────
            Le seul CTA vivait en bas de page, hors de portée du visiteur mobile
            qui ne déroule pas, et n'émettait AUCUN événement.

            ★ Il porte désormais le contexte de spot. Il pointait `/carnet/nouvelle`
            NU, ce qui envoie un visiteur sans compte sur l'écran « Choisis d'abord
            ton spot » qui le renvoie chercher ailleurs, alors que la page liste
            déjà jusqu'à 5 spots et que tout le parcours anonyme des sprints 77/86
            ne fonctionne QU'AVEC un spot en contexte.
            `?spot_id=` accepte l'UUID comme le slug (cf app/carnet/nouvelle/page.tsx,
            correctif du sprint 79 Bloc 3) : on passe l'UUID, forme canonique.
            Le nom du spot est raccourci avant le cadratin, sinon le libellé du
            bouton déborde à 390 px. */}
        <SeoInlineCta
          template="peche"
          slug={programmaticUrl(page).replace('/peche/', '')}
          position="inline"
          href={
            spots.length > 0
              ? `/carnet/nouvelle?spot_id=${spots[0].id}`
              : `/spots?species=${species.dbKey}`
          }
          label={
            spots.length > 0
              ? `Loguer une prise à ${shortSpotName(spots[0].name)}`
              : `Trouver un spot à ${species.labelLower}`
          }
          headline={`Ta prochaine prise ${species.articleDe}${species.labelLower} mérite mieux qu'un souvenir.`}
          note="Marée, météo et conditions enregistrées automatiquement."
        />

        {/* ── L'espèce ────────────────────────────────────────────────── */}
        <section className="prose prose-slate mt-10 max-w-none prose-headings:font-display prose-headings:text-navy-900 prose-p:text-ink-700 prose-li:text-ink-700 prose-strong:text-navy-900">
          {content.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}

          {/* ── La technique ──────────────────────────────────────────── */}
          {techContent && (
            <>
              <h2>
                {species.article}{species.labelLower} {technique.withArticle} : comment t&apos;y prendre
              </h2>
              {techContent.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </>
          )}

          {/* ── Le coin (pages départementales) ───────────────────────── */}
          {page.deptCode && (
            <>
              <h2>
                Pêcher {species.article.toLowerCase()}{species.labelLower} {deptPreposition(page.deptCode)}
                {deptLabel}
              </h2>
              <p>{content.facades[facadeOf(page.deptCode)]}</p>
            </>
          )}

          {/* ── Marées & conditions ───────────────────────────────────── */}
          <h2>Marées et conditions : quand sortir</h2>
          <p>{content.conditions}</p>
          <p>
            Pour aller plus loin :{' '}
            <Link href="/guides/comment-lire-une-courbe-de-maree">
              apprends à lire une courbe de marée
            </Link>,{' '}
            chaque fiche spot de la carte affiche la courbe du jour avec les horaires de pleine et
            basse mer.
          </p>
        </section>

        {/* ── Spots live ──────────────────────────────────────────────── */}
        {spots.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl text-navy-900">
              Où pêcher {species.article.toLowerCase()}{species.labelLower}
              {deptLabel ? ` ${deptPreposition(page.deptCode!)}${deptLabel}` : ''} : les spots de la
              carte
            </h2>
            <div className="mt-4 flex flex-col gap-2.5">
              {spots.map((s) => (
                <Link
                  key={s.slug}
                  href={`/spots/${s.slug}`}
                  className="group flex items-center gap-3.5 rounded-[14px] border border-sand-200 bg-white p-4 transition-colors hover:border-teal-500/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy-950 text-teal-300">
                    <MapPin size={16} strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-navy-900">
                      {s.name}
                    </span>
                    <TagData className="block truncate">
                      {s.structure
                        ? (STRUCTURE_LABELS[s.structure] ?? s.structure).toUpperCase()
                        : 'SPOT'}
                      {' · '}
                      {s.species
                        .slice(0, 3)
                        .map((sp) => sp.replace(/_/g, ' ').toUpperCase())
                        .join(' · ')}
                    </TagData>
                  </span>
                  <ArrowRight
                    size={15}
                    className="shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600"
                  />
                </Link>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-ink-600">
              Coordonnées floutées de plusieurs centaines de mètres en accès gratuit :{' '}
              <Link href="/carte" className="font-medium text-teal-700 hover:underline">
                explore la carte complète
              </Link>
              .
            </p>
          </section>
        )}

        {/* ── Guides liés ─────────────────────────────────────────────── */}
        {relatedGuides.length > 0 && (
          <section className="mt-10">
            <TagData className="mb-3 block">POUR CREUSER</TagData>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedGuides.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  className="group rounded-[14px] border border-sand-200 bg-white p-4 transition-colors hover:border-teal-500/40"
                >
                  <p className="text-[14px] font-semibold leading-snug text-navy-900 group-hover:text-teal-700">
                    {g.title}
                  </p>
                  <TagData className="mt-1.5 block">
                    {g.category.toUpperCase()} · {g.readTime} MIN
                  </TagData>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Maillage ────────────────────────────────────────────────── */}
        <section className="mt-10">
          {otherTechniques.length > 0 && (
            <>
              {/* L'article vient du référentiel : « LE BAR », « LA SEICHE »,
                  « L'ORPHIE ». Il était codé en dur au masculin, ce qui servait
                  « LE ORPHIE AUTREMENT » et « LE DORADE ROYALE AUTREMENT » en
                  production (sprint 83, Bloc 4). */}
              <TagData className="mb-2.5 block">
                {species.article.toUpperCase()}
                {species.label.toUpperCase()} AUTREMENT
              </TagData>
              <div className="mb-6 flex flex-wrap gap-2">
                {otherTechniques.map((p) => (
                  <Link
                    key={p.technique}
                    href={programmaticUrl(p)}
                    className="rounded-full border border-sand-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink-600 transition-colors hover:border-teal-500/40 hover:text-navy-900"
                  >
                    {TECHNIQUES[p.technique].label}
                  </Link>
                ))}
              </div>
            </>
          )}
          <TagData className="mb-2.5 block">PAR DÉPARTEMENT</TagData>
          <div className="flex flex-wrap gap-2">
            {deptLinks.map((d) => (
              <Link
                key={d}
                href={programmaticUrl({ ...page, deptCode: d })}
                className="rounded-full border border-sand-200 bg-white px-3.5 py-1.5 font-mono text-[12px] font-medium tracking-[0.04em] text-ink-600 transition-colors hover:border-teal-500/40 hover:text-navy-900"
              >
                {DEPARTMENT_LABELS[d]} · {d}
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA de fin ──────────────────────────────────────────────────
            Conservé pour qui a tout lu : même bloc navy, même copie. Il passe
            par la primitive pour être instrumenté (`position: 'footer'`) et
            porte lui aussi le contexte de spot. */}
        <SeoInlineCta
          template="peche"
          slug={programmaticUrl(page).replace('/peche/', '')}
          position="footer"
          variant="card"
          href={
            spots.length > 0
              ? `/carnet/nouvelle?spot_id=${spots[0].id}`
              : `/spots?species=${species.dbKey}`
          }
          label={spots.length > 0 ? 'Logue ta prise' : `Trouver un spot à ${species.labelLower}`}
          headline={`Ta prochaine prise ${species.articleDe}${species.labelLower} mérite mieux qu'un souvenir.`}
          note="Logue-la : conditions auto-enregistrées, patterns qui se dessinent, et un carnet qui apprend où et quand TU pêches le mieux."
        />
      </div>
    </div>
  )
}
