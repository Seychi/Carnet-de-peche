import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MapShell from '@/components/map/MapShell'
import { getUserTier } from '@/lib/auth/tier'
import type { UserTier } from '@/lib/auth/tier'
import { toSpotMarker, limitSpotsPerDept, COASTAL_DEFAULT_CENTER, COASTAL_DEFAULT_ZOOM } from '@/lib/map/utils'
import type { SpotMarker } from '@/lib/map/utils'
import { getCenterForDepartment } from '@/lib/geo/department-centroids'

export const metadata: Metadata = {
  title: 'Carte des spots de pêche — Carnet de Pêche',
  description:
    'Carte interactive des spots de pêche à la canne du bord en France. Filtre par espèce et technique, marées et météo en temps réel. Logue tes prises pour affiner les scores.',
}

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

  let deptFilter: string | null = null
  switch (tier) {
    case 'local':
      // Tous les spots du département principal de l'user
      deptFilter = homeDept
      break
    case 'itinerant':
      // Tous les spots de tous les départements côtiers — pas de filtre
      deptFilter = null
      break
    default:
      // anonymous / discovery : pas de filtre, on limitera ensuite
      deptFilter = null
  }

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

export default async function CartePage() {
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

  return (
    <MapShell
      spots={spots}
      userTier={tier}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
    />
  )
}
