import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronRight, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
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

  return {
    title: `${title} · Carnet de Pêche`,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'article', locale: 'fr_FR' },
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

async function fetchData(page: ProgrammaticPage): Promise<{
  spots: SpotLite[]
  catches30d: number
  deptsWithSpots: string[]
}> {
  const supabase = await createClient()
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
    : // page nationale → les départements qui ont des spots, sinon les bretons
      (deptsWithSpots.length > 0 ? deptsWithSpots : ['29', '56', '22', '35']).slice(0, 8)

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
      <section className="relative overflow-hidden bg-navy-950 pt-10 pb-12">
        <Bathy opacity={0.3} />
        <div className="relative mx-auto max-w-[860px] px-5">
          <nav className="mb-6 flex flex-wrap items-center gap-2" aria-label="Fil d'ariane">
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
          <h1 className="font-display text-white">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/60">
            {species.label} <em className="text-white/40">({species.latin})</em>{' '}
            {technique.withArticle}, vu du bord : les postes, les saisons, les marées qui comptent.
          </p>
          {catches30d > 0 && (
            <TagData variant="on-dark" className="mt-5 block">
              ● {catches30d} PRISE{catches30d > 1 ? 'S' : ''} DE {species.label.toUpperCase()} LOGUÉE
              {catches30d > 1 ? 'S' : ''} CES 30 DERNIERS JOURS
              {deptLabel ? ` · ${deptLabel.toUpperCase()}` : ' · FRANCE'}
            </TagData>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[860px] px-5 py-10">
        {/* ── L'espèce ────────────────────────────────────────────────── */}
        <section className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-navy-900 prose-p:text-ink-700 prose-li:text-ink-700 prose-strong:text-navy-900">
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
              <div className="not-prose my-6 rounded-[14px] border border-sand-200 bg-white p-5">
                <TagData className="mb-3 block">L&apos;ESSENTIEL · {technique.label.toUpperCase()}</TagData>
                <ul className="flex flex-col gap-2 text-[14px] leading-relaxed text-ink-700">
                  {techContent.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-sand-200 pt-3 text-[13px] text-ink-600">
                  <strong className="text-navy-900">Quand :</strong> {techContent.seasonNote}
                </p>
              </div>
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
            </Link>{' '}
            — chaque fiche spot de la carte affiche la courbe du jour avec les horaires de pleine et
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
              Coordonnées floutées de plusieurs centaines de mètres en accès gratuit —{' '}
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
              <TagData className="mb-2.5 block">LE {species.label.toUpperCase()} AUTREMENT</TagData>
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

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <section className="relative mt-12 overflow-hidden rounded-[18px] bg-navy-950 p-7 text-center">
          <Bathy density={2} opacity={0.3} />
          <div className="relative">
            <p className="font-display text-xl text-white">
              Ta prochaine prise {species.articleDe}{species.labelLower} mérite mieux qu&apos;un souvenir.
            </p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-white/60">
              Logue-la : conditions auto-enregistrées, patterns qui se dessinent, et un carnet qui
              apprend où et quand TU pêches le mieux.
            </p>
            <Link
              href="/carnet/nouvelle"
              className="mt-5 inline-block rounded-lg bg-teal-500 px-6 py-3 text-[14.5px] font-semibold text-navy-950 transition-colors hover:bg-teal-300"
            >
              Logue ta prise
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
