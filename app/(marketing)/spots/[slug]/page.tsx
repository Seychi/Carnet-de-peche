import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation, ArrowLeft, ChevronRight, AlertTriangle, Lock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import SpotMiniMap from '@/components/spots/SpotMiniMap'
import SpotConditionsSection from '@/components/spots/SpotConditionsSection'
import { fetchSpotConditions } from '@/lib/conditions/spot-forecast'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// ─── Types ────────────────────────────────────────────────────────────────────

type SpotDetail = {
  id: string
  name: string
  slug: string
  department: string
  region: string
  lng: number
  lat: number
  is_precise: boolean
  techniques: string[]
  species: string[]
  structure: string | null
  difficulty: number | null
  description: string | null
  access_notes: string | null
  hazards: string[] | null
  visibility: string
  verified: boolean
  created_at: string
}

type PublicCatch = {
  id: string
  species: string
  size_cm: number | null
  weight_g: number | null
  caught_at: string
  username: string | null
  display_name: string | null
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

const getSpotBySlug = cache(async (slug: string): Promise<SpotDetail | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_spot_by_slug', { p_slug: slug })
  if (error || !data || data.length === 0) return null
  const row = data[0]
  return {
    ...row,
    department: String(row.department).trim(),
    structure: row.structure ?? null,
    difficulty: row.difficulty ?? null,
    description: row.description ?? null,
    access_notes: row.access_notes ?? null,
    hazards: row.hazards ?? null,
  } as SpotDetail
})

async function fetchRecentCatches(spotId: string): Promise<PublicCatch[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('catches_for_viewer')
    .select('id, species, size_cm, weight_g, caught_at, username, display_name')
    .eq('spot_id', spotId)
    .eq('privacy', 'public')
    .order('caught_at', { ascending: false })
    .limit(5)
  return (data ?? []) as PublicCatch[]
}

async function fetchCatchCount(spotId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('catches_for_viewer')
    .select('id', { count: 'exact', head: true })
    .eq('spot_id', spotId)
    .eq('privacy', 'public')
  return count ?? 0
}

// ─── SEO ──────────────────────────────────────────────────────────────────────

export const revalidate = 1800

const BASE_URL = 'https://carnet-de-peche.vercel.app'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const spot = await getSpotBySlug(slug)
  if (!spot) return { title: 'Spot introuvable — Carnet de Pêche' }

  const structureLabel = (spot.structure && STRUCTURE_LABELS[spot.structure]) ?? 'Spot'
  const topSpecies = spot.species.slice(0, 3).map((s) => SPECIES_LABELS[s] ?? s).join(', ')
  const deptLabel = DEPARTMENT_LABELS[spot.department] ?? spot.department
  const canonicalUrl = `${BASE_URL}/spots/${spot.slug}`

  const title = `Pêche à ${spot.name} (${spot.department}) — ${topSpecies} · Carnet de Pêche`
  const description = `${structureLabel} pour pêcher ${topSpecies} dans le ${deptLabel}. Conditions, marées et techniques recommandées.`.slice(0, 158)
  const ogDescription = spot.description
    ? `${spot.description.slice(0, 150)}${spot.description.length > 150 ? '…' : ''}`
    : description

  return {
    title,
    description,
    openGraph: {
      title: `${spot.name} — Spot de pêche ${structureLabel.toLowerCase()}`,
      description: ogDescription,
      url: canonicalUrl,
      images: [{ url: `/og/spot/${spot.slug}`, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: spot.name,
      description: topSpecies,
      images: [`/og/spot/${spot.slug}`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DifficultyStars({ difficulty }: { difficulty: number | null }) {
  const d = difficulty ?? 0
  return (
    <span className="flex items-center gap-0.5" aria-label={`Difficulté ${d} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= d ? 'text-amber-400' : 'text-white/20'} aria-hidden>★</span>
      ))}
    </span>
  )
}


function CatchCard({ c }: { c: PublicCatch }) {
  const author = c.display_name || c.username || 'Anonyme'
  let dateStr = ''
  try {
    dateStr = formatDistanceToNow(new Date(c.caught_at), { addSuffix: true, locale: fr })
  } catch {
    dateStr = '—'
  }

  return (
    <div className="shrink-0 w-44 md:w-auto snap-start bg-white border border-ink-100 rounded-[14px] p-4">
      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 mb-3">
        {SPECIES_LABELS[c.species] ?? c.species}
      </span>
      <p className="text-2xl font-bold text-navy-900 leading-none">
        {c.size_cm ? `${c.size_cm} cm` : '—'}
      </p>
      {c.weight_g && c.weight_g > 0 && (
        <p className="text-sm text-ink-500 mt-1">{(c.weight_g / 1000).toFixed(1)} kg</p>
      )}
      <p className="text-xs text-ink-500 mt-3 truncate">{author}</p>
      <p className="text-xs text-ink-300">{dateStr}</p>
    </div>
  )
}

function RecentCatchesSection({
  catches, totalCount, ctaHref,
}: {
  catches: PublicCatch[]
  totalCount: number
  ctaHref: string
}) {
  return (
    <section className="bg-white rounded-[18px] border border-ink-100 p-5 md:p-7">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-navy-900 text-xl">Prises récentes</h2>
        {totalCount > 0 && (
          <span className="text-xs text-ink-500">
            {totalCount} prise{totalCount > 1 ? 's' : ''} au total
          </span>
        )}
      </div>

      {catches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-ink-400 text-sm mb-4">
            Sois le premier à loguer une prise ici
          </p>
          <Link
            href={ctaHref}
            className="inline-block px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Logger ma prise
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory md:grid md:grid-cols-2 md:overflow-visible md:mx-0 md:px-0 lg:grid-cols-3">
            {catches.map((c) => <CatchCard key={c.id} c={c} />)}
          </div>
          {totalCount > 5 && (
            <p className="text-xs text-ink-400 text-center mt-4">
              +{totalCount - 5} autre{totalCount - 5 > 1 ? 's' : ''} prise{totalCount - 5 > 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </section>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function SpotPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const [spot, { data: { user } }] = await Promise.all([
    getSpotBySlug(slug),
    supabase.auth.getUser(),
  ])

  if (!spot) notFound()

  const [catches, catchCount, conditions] = await Promise.all([
    fetchRecentCatches(spot.id),
    fetchCatchCount(spot.id),
    fetchSpotConditions(spot.lat, spot.lng, new Date()).catch(() => null),
  ])

  const ctaHref = user
    ? `/carnet/nouvelle?spot_id=${spot.id}`
    : `/auth/login?next=/spots/${spot.slug}`

  const googleMapsUrl =
    `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`

  const structureLabel = STRUCTURE_LABELS[spot.structure ?? ''] ?? spot.structure ?? ''

  // JSON-LD Place — tous les spots non-privés, coords toujours à 2dp (fuzzy safe pour le markup public)
  const jsonLd = spot.visibility !== 'private' ? {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: spot.name,
    description: spot.description ?? undefined,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: Math.round(spot.lat * 100) / 100,
      longitude: Math.round(spot.lng * 100) / 100,
    },
    address: {
      '@type': 'PostalAddress',
      addressRegion: spot.region,
      addressCountry: 'FR',
    },
  } : null

  return (
    <main className="bg-sand-50 min-h-screen pb-20 md:pb-0">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-navy-900 pt-10 pb-16">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-sm text-white/50 mb-6 flex-wrap" aria-label="Fil d'ariane">
            <Link href="/spots" className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />Spots
            </Link>
            <ChevronRight size={14} />
            <span className="capitalize">{spot.region}</span>
            <ChevronRight size={14} />
            <span>Dép. {spot.department}</span>
            <ChevronRight size={14} />
            <span className="text-white/80 truncate max-w-[160px]">{spot.name}</span>
          </nav>

          <div className="flex items-start gap-3 flex-wrap mb-3">
            {spot.verified && (
              <span className="text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-1 rounded-full font-medium">
                ✓ Spot vérifié
              </span>
            )}
            {spot.visibility === 'subscriber' && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full font-medium">
                Premium
              </span>
            )}
          </div>

          <h1 className="text-white font-display mb-4">{spot.name}</h1>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
              Dép. {spot.department}
            </span>
            {structureLabel && (
              <span className="text-sm text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                {structureLabel}
              </span>
            )}
            <DifficultyStars difficulty={spot.difficulty} />
            {spot.species.slice(0, 3).map((s) => (
              <span key={s} className="text-sm text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-full">
                {SPECIES_LABELS[s] ?? s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

          {/* ── Colonne principale ─────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Carte mini + GPS */}
            <div>
              <div className="rounded-[18px] overflow-hidden border border-ink-100" style={{ height: 280 }}>
                <SpotMiniMap
                  id={spot.id}
                  slug={spot.slug}
                  name={spot.name}
                  lng={spot.lng}
                  lat={spot.lat}
                  isPrecise={spot.is_precise}
                  department={spot.department}
                  region={spot.region}
                  species={spot.species}
                  techniques={spot.techniques}
                  difficulty={spot.difficulty ?? 3}
                  structure={spot.structure}
                  verified={spot.verified}
                />
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-ink-200 bg-white text-ink-700 text-sm font-medium hover:bg-ink-50 hover:border-teal-400 transition-colors"
              >
                <Navigation size={15} className="text-teal-500" />
                Itinéraire GPS
                <span className="text-xs text-ink-400">· Google Maps</span>
              </a>

              {!spot.is_precise && (
                <p className="text-xs text-ink-400 text-center mt-2">
                  Coordonnées approchées — abonne-toi pour le GPS précis
                </p>
              )}
            </div>

            {/* Conditions */}
            {conditions && (
              <SpotConditionsSection
                spotName={spot.name}
                lat={spot.lat}
                lng={spot.lng}
                conditions={conditions}
              />
            )}

            {/* Prises récentes */}
            <RecentCatchesSection
              catches={catches}
              totalCount={catchCount}
              ctaHref={ctaHref}
            />

            {/* Description */}
            {spot.description && (
              <section className="bg-white rounded-[18px] border border-ink-100 p-6 md:p-7">
                <h2 className="font-display text-navy-900 text-xl mb-4">Description</h2>
                <p className="text-ink-700 leading-relaxed">{spot.description}</p>
              </section>
            )}

            {/* Accès */}
            {spot.access_notes && (
              <section className="bg-white rounded-[18px] border border-ink-100 p-6 md:p-7">
                <h2 className="font-display text-navy-900 text-xl mb-4">Accès</h2>
                <p className="text-ink-700 leading-relaxed">{spot.access_notes}</p>
              </section>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────────────────── */}
          <aside className="flex flex-col gap-5">

            {/* Infos pratiques */}
            <div className="bg-white rounded-[18px] border border-ink-100 p-6">
              <h3 className="font-semibold text-navy-900 text-sm mb-4 uppercase tracking-wide">
                Infos pratiques
              </h3>
              <dl className="flex flex-col gap-3.5">
                {structureLabel && (
                  <div className="flex justify-between text-sm gap-4">
                    <dt className="text-ink-500 shrink-0">Structure</dt>
                    <dd className="font-medium text-navy-900 text-right">{structureLabel}</dd>
                  </div>
                )}
                <div className="flex justify-between text-sm items-center">
                  <dt className="text-ink-500">Difficulté</dt>
                  <dd className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= (spot.difficulty ?? 0) ? 'text-amber-400' : 'text-ink-200'} aria-hidden>★</span>
                    ))}
                  </dd>
                </div>
                {spot.techniques.length > 0 && (
                  <div className="flex justify-between text-sm gap-4">
                    <dt className="text-ink-500 shrink-0">Techniques</dt>
                    <dd className="font-medium text-navy-900 text-right">
                      {spot.techniques.map((t) => TECHNIQUE_LABELS[t] ?? t).join(', ')}
                    </dd>
                  </div>
                )}
                {spot.species.length > 0 && (
                  <div className="flex justify-between text-sm gap-4">
                    <dt className="text-ink-500 shrink-0">Espèces</dt>
                    <dd className="font-medium text-navy-900 text-right">
                      {spot.species.map((s) => SPECIES_LABELS[s] ?? s).join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Dangers */}
            {spot.hazards && spot.hazards.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-[18px] p-6">
                <h3 className="flex items-center gap-2 font-semibold text-red-800 text-sm mb-3 uppercase tracking-wide">
                  <AlertTriangle size={14} />
                  Dangers
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {spot.hazards.map((h) => (
                    <li key={h} className="text-sm text-red-700 capitalize">
                      {h.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* GPS / upsell */}
            {spot.is_precise ? (
              <div className="bg-teal-50 border border-teal-100 rounded-[18px] p-6">
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">
                  GPS précis disponible
                </p>
                <p className="text-sm text-teal-900 font-mono">
                  {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
                </p>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 font-medium"
                >
                  <Navigation size={13} />
                  Ouvrir dans Maps
                </a>
              </div>
            ) : (
              <div className="bg-navy-900 rounded-[18px] p-6 text-center">
                <Lock size={24} strokeWidth={1.5} className="text-teal-400 mx-auto mb-3" />
                <p className="text-white font-semibold text-sm mb-1">Coordonnées précises</p>
                <p className="text-white/60 text-xs mb-5 leading-snug">
                  Score d&apos;activité, GPS exact, filtres avancés.
                </p>
                <Link
                  href="/tarifs"
                  className="block px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm rounded-[10px] transition-colors"
                >
                  Voir les formules
                </Link>
              </div>
            )}

            {/* CTA desktop */}
            <Link
              href={ctaHref}
              className="hidden md:block w-full py-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-center rounded-xl transition-colors text-sm"
            >
              Logger une prise ici
            </Link>
          </aside>
        </div>
      </div>

      {/* ── CTA collant mobile ──────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-ink-100 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <Link
          href={ctaHref}
          className="flex items-center justify-center gap-2 w-full py-3 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Logger une prise ici
        </Link>
      </div>
    </main>
  )
}
