import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Box, ChevronRight, Wind } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMyCatches, getMyCatchStats, getMyCatchesBreakdown } from '@/lib/catches/queries'
import { getMyOutingStats } from '@/lib/outings/queries'
import { getPersonalTendencies } from '@/lib/scoring/personal'
import { getUserTier } from '@/lib/auth/tier'
import { catchFiltersSchema } from '@/lib/catches/schema'
import { CatchStatsRow } from '@/components/catches/CatchStatsRow'
import { CatchStatsDetailed } from '@/components/catches/CatchStatsDetailed'
import { PersonalTendencies } from '@/components/scoring/PersonalTendencies'
import { CatchFiltersBar } from '@/components/catches/CatchFiltersBar'
import { CatchGrid } from '@/components/catches/CatchGrid'
import { NextWindowInsight } from '@/components/catches/NextWindowInsight'
import { OutingStats } from '@/components/outings/OutingStats'
import { TagData } from '@/components/ui-v2/tag-data'
import { ShareButton } from '@/components/share/ShareButton'
import { ManageShareCards } from '@/components/share/ManageShareCards'

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

  const [{ catches, totalCount }, stats, breakdown, personalTendencies, outingStats, tier, { data: profile }] = await Promise.all([
    getMyCatches(filters),
    getMyCatchStats().catch(() => null),
    getMyCatchesBreakdown().catch(() => null),
    getPersonalTendencies().catch(() => null),
    getMyOutingStats().catch(() => null),
    getUserTier().catch(() => undefined),
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

        {/* Sorties (dont bredouilles) — dénominateur honnête */}
        {outingStats && <OutingStats data={outingStats} className="mb-3" />}

        {/* Accès à la liste des sorties perso (partageables) */}
        {outingStats && outingStats.totalOutings > 0 && (
          <Link
            href="/carnet/sorties"
            className="mb-3 flex min-h-[44px] items-center gap-3 rounded-[14px] border border-sand-200 bg-white px-4 py-3 transition-colors hover:border-sand-300"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-500">
              <Wind size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-navy-900">Mes sorties</span>
              <span className="block text-[13px] text-ink-500">
                Tes sorties loguées, prises comme bredouilles, à partager sans montrer tes spots
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
          </Link>
        )}

        {/* Accès à « ma boîte » : ce que chaque leurre rapporte (sprint 37) */}
        <Link
          href="/carnet/boite"
          className="mb-3 flex min-h-[44px] items-center gap-3 rounded-[14px] border border-sand-200 bg-white px-4 py-3 transition-colors hover:border-sand-300"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-500">
            <Box size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold text-navy-900">Ma boîte à matériel</span>
            <span className="block text-[13px] text-ink-500">
              Ce que chaque leurre te rapporte, prises par espèce
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
        </Link>

        {/* Stats détaillées repliables */}
        {breakdown && <CatchStatsDetailed breakdown={breakdown} className="mb-5" />}

        {/* Tes tendances perso (calculées depuis tes prises réelles) — « ce que ton
            journal t'apprend ». La gamification (Pokédex/streak/badges) vit désormais
            sur /home « Aujourd'hui » (sprint 30) : le carnet reste le passé. */}
        {personalTendencies && (
          <PersonalTendencies data={personalTendencies} tier={tier} className="mb-5" />
        )}

        {/* Partager ses « conditions gagnantes » (sprint 38) — uniquement si le
            carnet a assez de prises pour des tendances réelles (pas de carte vide). */}
        {personalTendencies?.hasEnough && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-sand-200 bg-white px-4 py-3">
            <p className="text-[13.5px] text-ink-600">
              Fier de tes tendances ?{' '}
              <span className="font-medium text-navy-900">Partage-les</span>, sans jamais montrer tes spots.
            </p>
            <ShareButton
              input={{ kind: 'conditions' }}
              title="Mes conditions gagnantes — Carnet de Pêche"
              text="Voici quand et dans quelles conditions je sors le plus."
              label="Partager mes conditions"
              variant="ghost"
            />
          </div>
        )}

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

        {/* Gestion / révocation des cartes partagées (sprint 38). */}
        <ManageShareCards className="mt-6" />
      </div>
    </div>
  )
}
