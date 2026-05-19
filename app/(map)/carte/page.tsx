import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MapShell from '@/components/map/MapShell'
import { getUserTier } from '@/lib/auth/tier'
import type { UserTier } from '@/lib/auth/tier'
import { toSpotMarker, limitSpotsPerDept } from '@/lib/map/utils'
import type { SpotMarker } from '@/lib/map/utils'

export const metadata: Metadata = {
  title: 'Carte des spots de pêche — Carnet de Pêche',
  description:
    'Carte interactive des spots de pêche à la canne du bord en France. Filtre par espèce et technique, marées et météo en temps réel. Logue tes prises pour affiner les scores.',
}

async function fetchSpots(tier: UserTier): Promise<SpotMarker[]> {
  const supabase = await createClient()

  // Local : filtre sur le département principal de l'utilisateur
  let deptFilter: string | null = null
  if (tier === 'local') {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('home_department')
        .eq('id', user.id)
        .single()
      deptFilter = profile?.home_department ?? null
    }
  }

  const { data, error } = await supabase.rpc('get_spots_for_map', {
    dept_filter: deptFilter,
  })

  if (error || !data) return []

  const spots = data.map(toSpotMarker)

  // Gratuits et anonymes : max 3 spots par département
  if (tier === 'anonymous' || tier === 'discovery') {
    return limitSpotsPerDept(spots, 3)
  }
  return spots
}

export default async function CartePage() {
  const tier = await getUserTier()
  const spots = await fetchSpots(tier)

  return <MapShell spots={spots} userTier={tier} />
}
