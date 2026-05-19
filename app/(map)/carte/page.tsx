import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MapShell from '@/components/map/MapShell'
import { toSpotMarker, limitSpotsPerDept } from '@/lib/map/utils'
import type { SpotMarker } from '@/lib/map/utils'

export const metadata: Metadata = {
  title: 'Carte des spots de pêche — Carnet de Pêche',
  description:
    'Carte interactive des spots de pêche à la canne du bord en France. Filtre par espèce et technique, marées et météo en temps réel. Logue tes prises pour affiner les scores.',
}

type UserTier = 'anonymous' | 'discovery' | 'local' | 'itinerant'

async function getUserTier(): Promise<UserTier> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'anonymous'

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!sub) return 'discovery'
  if (sub.plan === 'local') return 'local'
  if (sub.plan === 'itinerant') return 'itinerant'
  return 'discovery'
}

async function fetchSpots(tier: UserTier): Promise<SpotMarker[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_spots_for_map')

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
