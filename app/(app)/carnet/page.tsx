import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyCatches, getMyCatchStats, getMyCatchesBreakdown } from '@/lib/catches/queries'
import { getMyCatchInsights } from '@/lib/catches/insights'
import { catchFiltersSchema } from '@/lib/catches/schema'
import { CatchStatsRow } from '@/components/catches/CatchStatsRow'
import { CatchStatsDetailed } from '@/components/catches/CatchStatsDetailed'
import { PersonalInsights } from '@/components/catches/PersonalInsights'
import { CatchFiltersBar } from '@/components/catches/CatchFiltersBar'
import { CatchGrid } from '@/components/catches/CatchGrid'
import { NextWindowInsight } from '@/components/catches/NextWindowInsight'
import { TagData } from '@/components/ui-v2/tag-data'

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

  // ── Fetch parallèle : prises + stats + dépt du profil (insight) ──────────

  const [{ catches, totalCount }, stats, breakdown, insights, { data: profile }] = await Promise.all([
    getMyCatches(filters),
    getMyCatchStats().catch(() => null),
    getMyCatchesBreakdown().catch(() => null),
    getMyCatchInsights().catch(() => null),
    supabase.from('profiles').select('home_department').eq('id', user.id).maybeSingle(),
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

  const season = new Date().getFullYear()
  const dept = profile?.home_department?.trim() ?? null

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">

        {/* En-tête (la nav, le « + Loguer » et le FAB vivent dans le shell) */}
        <header className="mb-5">
          <TagData>MON CARNET · SAISON {season}</TagData>
          <h1 className="mt-1 font-display text-[26px] leading-tight text-navy-900 sm:text-[32px]">
            {totalCount > 0
              ? `${totalCount} prise${totalCount > 1 ? 's' : ''}, et la carte commence à te connaître.`
              : 'Mon carnet'}
          </h1>
        </header>

        {/* Stats synthétiques */}
        {stats && <CatchStatsRow stats={stats} className="mb-3" />}

        {/* Stats détaillées repliables */}
        {breakdown && <CatchStatsDetailed breakdown={breakdown} className="mb-5" />}

        {/* Tes tendances perso (calculées depuis tes prises réelles) */}
        {insights && <PersonalInsights data={insights} className="mb-5" />}

        {/* Insight : prochain bon créneau du département (card live) */}
        {dept && <NextWindowInsight dept={dept} />}

        {/* Filtres */}
        <CatchFiltersBar
          initialSpecies={initialSpecies}
          initialTechniques={initialTechniques}
          initialDateFrom={initialDateFrom}
          className="mb-5"
        />

        {/* Liste des prises */}
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
    </div>
  )
}
