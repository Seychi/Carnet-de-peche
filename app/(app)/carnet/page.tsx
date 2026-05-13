import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMyCatches, getMyCatchStats, getMyCatchesBreakdown } from '@/lib/catches/queries'
import { catchFiltersSchema } from '@/lib/catches/schema'
import { CatchStatsRow } from '@/components/catches/CatchStatsRow'
import { CatchStatsDetailed } from '@/components/catches/CatchStatsDetailed'
import { CatchFiltersBar } from '@/components/catches/CatchFiltersBar'
import { CatchGrid } from '@/components/catches/CatchGrid'
import { BackButton } from '@/components/layout/BackButton'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 12

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CarnetPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams

  // ── Parsing des filtres depuis l'URL ──────────────────────────────────────

  const page = Math.max(1, parseInt(String(params.page ?? '1'), 10))

  const speciesRaw = params.species
  const species = speciesRaw
    ? Array.isArray(speciesRaw) ? speciesRaw : [speciesRaw]
    : undefined

  const techniqueRaw = params.technique
  const technique = techniqueRaw
    ? Array.isArray(techniqueRaw) ? techniqueRaw : [techniqueRaw]
    : undefined

  const filtersResult = catchFiltersSchema.safeParse({
    species,
    technique,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  const filters = filtersResult.success
    ? filtersResult.data
    : { limit: PAGE_SIZE, offset: 0 }

  // ── Fetch parallèle : prises + stats ─────────────────────────────────────

  const [{ catches, totalCount }, stats, breakdown] = await Promise.all([
    getMyCatches(filters),
    getMyCatchStats().catch(() => null),
    getMyCatchesBreakdown().catch(() => null),
  ])

  // ── Signed URLs pour les photos (batch) ───────────────────────────────────

  const photoPaths = catches.filter((c) => c.photo_path).map((c) => c.photo_path!)
  const photoUrls: Record<string, string> = {}

  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('catches')
      .createSignedUrls(photoPaths, 3600)

    // createSignedUrls retourne les URLs dans le même ordre que les paths en entrée
    signed?.forEach((item, i) => {
      if (item.signedUrl && photoPaths[i]) {
        photoUrls[photoPaths[i]] = item.signedUrl
      }
    })
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────

  const hasFilters = !!(species?.length || technique?.length || params.dateFrom || params.dateTo)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const initialSpecies = species ?? []
  const initialTechniques = technique ?? []
  const initialDateFrom = String(params.dateFrom ?? '')

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Flèche retour mobile (cachée sur desktop) */}
        <BackButton fallbackHref="/home" className="mb-3" />

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-navy-900">Mon carnet</h1>
          {/* CTA visible sur desktop, masqué mobile (FAB prend le relais) */}
          <Link
            href="/carnet/nouvelle"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-[10px] text-[14px] font-semibold hover:bg-teal-600 transition-colors"
          >
            <Plus size={16} />
            Loguer
          </Link>
        </div>

        {/* Stats synthétiques */}
        {stats && <CatchStatsRow stats={stats} className="mb-3" />}

        {/* Stats détaillées repliables */}
        {breakdown && <CatchStatsDetailed breakdown={breakdown} className="mb-5" />}

        {/* Filtres */}
        <CatchFiltersBar
          initialSpecies={initialSpecies}
          initialTechniques={initialTechniques}
          initialDateFrom={initialDateFrom}
          className="mb-5"
        />

        {/* Grille */}
        <CatchGrid
          catches={catches}
          photoUrls={photoUrls}
          totalCount={totalCount}
          page={page}
          totalPages={totalPages}
          hasFilters={hasFilters}
          searchParams={params}
        />
      </div>

      {/* FAB mobile */}
      <Link
        href="/carnet/nouvelle"
        aria-label="Loguer une prise"
        className="sm:hidden fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-teal-500 shadow-lg flex items-center justify-center hover:bg-teal-600 transition-colors"
      >
        <Plus size={24} className="text-white" />
      </Link>
    </div>
  )
}
