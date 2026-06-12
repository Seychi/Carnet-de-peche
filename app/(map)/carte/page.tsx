import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import MapShell from '@/components/map/MapShell'
import { getUserTier } from '@/lib/auth/tier'
import type { UserTier } from '@/lib/auth/tier'
import { toSpotMarker, limitSpotsPerDept, COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM } from '@/lib/map/utils'
import type { SpotMarker } from '@/lib/map/utils'
import { getCenterForDepartment } from '@/lib/geo/department-centroids'
import { parseFiltersFromSearchParams } from '@/lib/spots/filter-url.server'
import type { SpotFilters } from '@/lib/spots/filters-schema'
import type { QualityLevel } from '@/lib/solunar/types'

export const metadata: Metadata = {
  title: 'Carte des spots de pêche — Carnet de Pêche',
  description:
    'Carte interactive des spots de pêche à la canne du bord en France. Filtre par espèce et technique, marées et météo en temps réel. Logue tes prises pour affiner les scores.',
}

const UPSELL_COOKIE = 'upsell-dismissed-at'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

async function fetchProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', userId)
    .single()
  return data
}

async function fetchSpots(
  tier: UserTier,
  homeDept: string | null,
  filters: SpotFilters = {},
): Promise<SpotMarker[]> {
  const supabase = await createClient()

  const isPaid = tier === 'local' || tier === 'itinerant'

  const deptFilter: string | null =
    tier === 'local' ? homeDept :
    tier === 'itinerant' ? (filters.department ?? null) :
    null

  const speciesFilter: string[] | null =
    isPaid && filters.species?.length ? filters.species : null

  const techniqueFilter: string[] | null =
    isPaid && filters.techniques?.length ? filters.techniques : null

  const { data, error } = await supabase.rpc('get_spots_for_map', {
    dept_filter: deptFilter,
    species_filter: speciesFilter,
    technique_filter: techniqueFilter,
  })

  if (error || !data) return []

  const spots = data.map(toSpotMarker)

  if (tier === 'anonymous' || tier === 'discovery') {
    return limitSpotsPerDept(spots, 3)
  }
  return spots
}

// Scores pré-calculés par le cron (spot_scores). On ne garde que les scores
// frais (valid_until > now). Renvoie une Map spot_id → qualité actuelle.
async function fetchFreshScores(spotIds: string[]): Promise<Map<string, QualityLevel>> {
  const map = new Map<string, QualityLevel>()
  if (spotIds.length === 0) return map

  const supabase = await createClient()
  const { data } = await supabase
    .from('spot_scores')
    .select('spot_id, current_quality, valid_until')
    .gt('valid_until', new Date().toISOString())
    .in('spot_id', spotIds)

  for (const row of (data ?? []) as { spot_id: string; current_quality: QualityLevel }[]) {
    map.set(row.spot_id, row.current_quality)
  }
  return map
}

export default async function CartePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tier = await getUserTier()

  const profile = tier !== 'anonymous' && user ? await fetchProfile(user.id) : null
  const homeDept = profile?.home_department ?? null

  const initialCenter: [number, number] =
    tier !== 'anonymous' && homeDept
      ? getCenterForDepartment(homeDept)
      : COASTAL_DEFAULT_CENTER

  const initialZoom: number =
    tier !== 'anonymous' && homeDept ? 9 : COASTAL_DEFAULT_ZOOM

  // Filtres initiaux depuis l'URL
  const params = await searchParams
  const urlFilters = parseFiltersFromSearchParams(params)

  const isPaid = tier === 'local' || tier === 'itinerant'

  // Sécurité : les tiers gratuits ne peuvent pas filtrer via URL (bypass de la limite 3 spots/dept)
  const spotsRaw = await fetchSpots(tier, homeDept, isPaid ? urlFilters : {})

  // Merge des scores de qualité pré-calculés (markers colorisés)
  const scores = await fetchFreshScores(spotsRaw.map((s) => s.id))
  const spots = spotsRaw.map((s) => ({ ...s, currentQuality: scores.get(s.id) }))

  // Départements disponibles pour le sélecteur itinérant
  const availableDepartments = [...new Set(spots.map((s) => s.department))].sort()

  // Ne restaure pas les filtres URL pour les tiers gratuits
  const initialFilters = isPaid ? urlFilters : {}

  // Bandeau upsell discovery
  const cookieStore = await cookies()
  const dismissedAt = cookieStore.get(UPSELL_COOKIE)?.value
  const isDismissed = dismissedAt
    ? Date.now() - parseInt(dismissedAt, 10) < SEVEN_DAYS_MS
    : false
  const showUpsell = tier === 'discovery' && !isDismissed

  return (
    <>
      {/* h1 invisible : la carte n'a pas de titre visible (audit axe « page-has-heading-one ») */}
      <h1 className="sr-only">Carte des spots de pêche</h1>
      <MapShell
        spots={spots}
        userTier={tier}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        showUpsell={showUpsell}
        initialFilters={initialFilters}
        userDepartment={homeDept ?? undefined}
        availableDepartments={availableDepartments}
      />
    </>
  )
}
