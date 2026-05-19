import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import MapShell from '@/components/map/MapShell'
import { getUserTier } from '@/lib/auth/tier'
import type { UserTier } from '@/lib/auth/tier'
import { toSpotMarker, limitSpotsPerDept, COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM } from '@/lib/map/utils'
import type { SpotMarker } from '@/lib/map/utils'
import { getCenterForDepartment } from '@/lib/geo/department-centroids'
import { parseFiltersFromSearchParams } from '@/lib/spots/filter-url'

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

async function fetchSpots(tier: UserTier, homeDept: string | null): Promise<SpotMarker[]> {
  const supabase = await createClient()

  const deptFilter = tier === 'local' ? homeDept : null

  const { data, error } = await supabase.rpc('get_spots_for_map', {
    dept_filter: deptFilter,
  })

  if (error || !data) return []

  const spots = data.map(toSpotMarker)

  if (tier === 'anonymous' || tier === 'discovery') {
    return limitSpotsPerDept(spots, 3)
  }
  return spots
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

  const spots = await fetchSpots(tier, homeDept)

  // Départements disponibles pour le sélecteur itinérant
  const availableDepartments = [...new Set(spots.map((s) => s.department))].sort()

  // Filtres initiaux depuis l'URL
  const params = await searchParams
  const initialFilters = parseFiltersFromSearchParams(params)

  // Bandeau upsell discovery
  const cookieStore = await cookies()
  const dismissedAt = cookieStore.get(UPSELL_COOKIE)?.value
  const isDismissed = dismissedAt
    ? Date.now() - parseInt(dismissedAt, 10) < SEVEN_DAYS_MS
    : false
  const showUpsell = tier === 'discovery' && !isDismissed

  return (
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
  )
}
