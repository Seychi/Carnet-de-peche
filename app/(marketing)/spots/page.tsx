import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS, COASTAL_DEPARTMENTS } from '@/lib/geo/departments'

export const revalidate = 3600

const BASE_URL = 'https://www.carnet-de-peche.com'

// ── Types ──────────────────────────────────────────────────────────────────────

type SpotRow = {
  id: string
  name: string
  slug: string
  department: string
  species: string[]
  techniques: string[]
  structure: string | null
  difficulty: number | null
}

type Props = {
  searchParams: Promise<{ dept?: string; species?: string }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildH1(dept?: string, species?: string): string {
  const speciesLabel = species ? (SPECIES_LABELS[species] ?? species) : null
  const deptLabel = dept ? `${DEPARTMENT_LABELS[dept] ?? dept} (${dept})` : null
  if (speciesLabel && deptLabel) return `Spots à ${speciesLabel} dans le ${deptLabel}`
  if (speciesLabel) return `Spots à ${speciesLabel} en France`
  if (deptLabel) return `Spots de pêche dans le ${deptLabel}`
  return 'Spots de pêche à la canne du bord en France'
}

function buildDescription(dept?: string, species?: string): string {
  const sp = species ? (SPECIES_LABELS[species]?.toLowerCase() ?? species) : null
  const dp = dept ? (DEPARTMENT_LABELS[dept] ?? dept) : null
  if (sp && dp)
    return `Tous les spots à ${sp} dans le ${dp}. Fiches avec conditions météo, marées et prises de la communauté.`
  if (sp)
    return `Tous les spots à ${sp} sur le littoral français. Conditions, marées et scores d'activité par spot.`
  if (dp)
    return `Tous les spots de pêche à la canne du bord dans le ${dp}. Fiches complètes avec données environnementales.`
  return 'Annuaire complet des spots de pêche à la canne du bord en France. Conditions météo, marées et prises récentes pour chaque spot.'
}

// ── Data ───────────────────────────────────────────────────────────────────────

async function fetchPublicSpots(dept?: string, species?: string): Promise<SpotRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('spots')
    .select('id, name, slug, department, species, techniques, structure, difficulty')
    .eq('visibility', 'public')
    .order('department', { ascending: true })
    .order('name', { ascending: true })
  if (dept) query = query.eq('department', dept)
  if (species) query = query.contains('species', [species])
  const { data, error } = await query
  if (error) {
    console.error('[SpotsPage] fetchPublicSpots:', error.message)
    return []
  }
  return (data ?? []) as SpotRow[]
}

function groupByDepartment(spots: SpotRow[]): [string, SpotRow[]][] {
  const map = new Map<string, SpotRow[]>()
  for (const spot of spots) {
    const key = String(spot.department).trim()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(spot)
  }
  // Tri numérique (29 avant 33, 2A/2B à leur place)
  return [...map.entries()].sort(([a], [b]) => {
    const na = parseInt(a)
    const nb = parseInt(b)
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb
    if (!isNaN(na) && isNaN(nb)) return -1
    if (isNaN(na) && !isNaN(nb)) return 1
    return a.localeCompare(b)
  })
}

// ── SEO ────────────────────────────────────────────────────────────────────────

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { dept, species } = await searchParams
  const title = `${buildH1(dept, species)} — Carnet de Pêche`
  const description = buildDescription(dept, species)
  const canonical = dept || species
    ? `${BASE_URL}/spots?${new URLSearchParams({ ...(dept ? { dept } : {}), ...(species ? { species } : {}) }).toString()}`
    : `${BASE_URL}/spots`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: buildH1(dept, species),
      description,
      url: canonical,
      type: 'website',
      images: [{ url: `${BASE_URL}/og/spots`, width: 1200, height: 630, alt: 'Spots de pêche en France — Carnet de Pêche' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: buildH1(dept, species),
      description,
      images: [`${BASE_URL}/og/spots`],
    },
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SpotCard({ spot }: { spot: SpotRow }) {
  const topSpecies = spot.species.slice(0, 3)
  const topTechniques = spot.techniques.slice(0, 2)
  const structureLabel = spot.structure ? (STRUCTURE_LABELS[spot.structure] ?? null) : null

  return (
    <Link
      href={`/spots/${spot.slug}`}
      className="group flex flex-col gap-3 bg-white border border-ink-100 rounded-[14px] p-4 hover:shadow-md hover:border-teal-500/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      <div className="min-w-0">
        <p className="font-semibold text-navy-900 text-sm leading-snug group-hover:text-teal-700 transition-colors truncate">
          {spot.name}
        </p>
        {structureLabel && (
          <p className="text-xs text-ink-500 mt-0.5">{structureLabel}</p>
        )}
      </div>

      {topSpecies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topSpecies.map((s) => (
            <span key={s} className="text-[11px] bg-teal-500/10 text-teal-700 px-2 py-0.5 rounded-full font-medium">
              {SPECIES_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      )}

      {topTechniques.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {topTechniques.map((t) => (
            <span key={t} className="text-[11px] bg-navy-900/10 text-navy-900 px-2 py-0.5 rounded-full font-medium">
              {TECHNIQUE_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function SpotsPage({ searchParams }: Props) {
  const { dept, species } = await searchParams
  const spots = await fetchPublicSpots(dept, species)

  if (spots.length > 500) {
    console.warn(
      `[SpotsPage] ${spots.length} spots publics — penser à paginer ` +
      `(/spots/page/2) ou à splitter par département (/spots/departement/29)`
    )
  }

  const h1 = buildH1(dept, species)
  const grouped = groupByDepartment(spots)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: h1,
    itemListElement: spots.map((spot, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/spots/${spot.slug}`,
      name: spot.name,
    })),
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-navy-900 pt-16 pb-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <h1 className="text-white font-display max-w-2xl">{h1}</h1>
          <p className="mt-4 text-white/60 max-w-2xl text-base leading-relaxed">
            {dept || species
              ? `${spots.length} spot${spots.length > 1 ? 's' : ''} trouvé${spots.length > 1 ? 's' : ''} — fiches détaillées avec conditions météo, marées et prises de la communauté.`
              : "Retrouve tous les spots de pêche à la canne du bord sur le littoral français. Chaque fiche intègre les conditions météo, les marées et les prises récentes pour que tu choisisses le bon spot au bon moment."}
          </p>
        </div>
      </section>

      {/* ── Filtres — form HTML GET, server-side ────────────────────────── */}
      <section className="bg-white border-b border-ink-100 py-5 sticky top-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6">
          <form method="GET" action="/spots" className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="filter-dept"
                className="text-xs font-medium text-ink-500 uppercase tracking-wide"
              >
                Département
              </label>
              <select
                id="filter-dept"
                name="dept"
                defaultValue={dept ?? ''}
                className="px-4 py-2.5 rounded-[10px] border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Tous les départements</option>
                {COASTAL_DEPARTMENTS.map((code) => (
                  <option key={code} value={code}>
                    {code} — {DEPARTMENT_LABELS[code] ?? code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="filter-species"
                className="text-xs font-medium text-ink-500 uppercase tracking-wide"
              >
                Espèce
              </label>
              <select
                id="filter-species"
                name="species"
                defaultValue={species ?? ''}
                className="px-4 py-2.5 rounded-[10px] border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Toutes les espèces</option>
                {Object.entries(SPECIES_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-[10px] transition-colors whitespace-nowrap"
            >
              Filtrer
            </button>

            {(dept || species) && (
              <Link
                href="/spots"
                className="text-sm text-ink-500 hover:text-ink-700 transition-colors py-2.5"
              >
                Réinitialiser
              </Link>
            )}
          </form>
        </div>
      </section>

      {/* ── Corps — spots groupés par département ────────────────────────── */}
      <section className="bg-sand-50 py-10">
        <div className="max-w-[1280px] mx-auto px-6">
          {spots.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-semibold text-navy-900 text-lg mb-2">Aucun spot trouvé</p>
              <p className="text-sm text-ink-500 mb-6">
                Essaie un autre filtre ou reviens bientôt — la base grossit chaque semaine.
              </p>
              <Link
                href="/spots"
                className="inline-block px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-[10px] transition-colors"
              >
                Voir tous les spots
              </Link>
            </div>
          ) : (
            <div className="space-y-14">
              {grouped.map(([deptCode, deptSpots]) => (
                <div key={deptCode}>
                  <h2 className="font-display text-navy-900 text-xl mb-1">
                    {DEPARTMENT_LABELS[deptCode] ?? deptCode}
                    <span className="text-ink-400 text-base font-normal ml-2">({deptCode})</span>
                  </h2>
                  <p className="text-sm text-ink-500 mb-5">
                    {deptSpots.length} spot{deptSpots.length > 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deptSpots.map((spot) => (
                      <SpotCard key={spot.id} spot={spot} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Upsell ──────────────────────────────────────────────────────── */}
      <section className="bg-white py-12 border-t border-ink-100">
        <div className="max-w-[760px] mx-auto px-6 text-center">
          <h2 className="font-display text-navy-900 text-2xl mb-3">
            Accède aux coordonnées précises
          </h2>
          <p className="text-ink-500 mb-6 text-sm leading-relaxed max-w-md mx-auto">
            GPS exact, score d&apos;activité et données de marée sur chaque spot.
            Abonnement Local à partir de 4,90 €/mois.
          </p>
          <Link
            href="/tarifs"
            className="inline-block px-8 py-3 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors text-sm"
          >
            Voir les formules
          </Link>
        </div>
      </section>
    </main>
  )
}
