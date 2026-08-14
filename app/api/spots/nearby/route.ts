import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/auth/tier'
import { nearbyQuerySchema } from '@/lib/spots/nearby'
import type { NearbySpot } from '@/lib/spots/nearby'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const parsed = nearbyQuerySchema.safeParse({
    lat: searchParams.get('lat'),
    lng: searchParams.get('lng'),
    radius_km: searchParams.get('radius_km') ?? undefined,
    species: searchParams.get('species') ?? undefined,
    techniques: searchParams.get('techniques') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { lat, lng, radius_km, species, techniques } = parsed.data

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('nearby_spots', {
    lat,
    lng,
    radius_km,
    species_filter: species ?? null,
    technique_filter: techniques ?? null,
  })

  if (error) {
    console.error('[nearby_spots] RPC error:', error.message)
    return NextResponse.json(
      { error: 'Impossible de récupérer les spots' },
      { status: 500 }
    )
  }

  // Garde de tier serveur (double sécurité avec le plafond SQL de la migration 029) :
  // anon = 3 max, tout compte = tout (la RPC limite déjà à 100).
  //
  // ⚠️ Sprint 77, Bloc 1 : `discovery` était plafonné à 5 ici. La migration 110
  // lui ouvre `nearby_spots` côté base ; ce cap applicatif l'aurait retranché
  // juste après. Il suit désormais la même règle que la clause SQL : seul
  // l'anonyme est plafonné. La précision des coordonnées, elle, ne bouge pas.
  const tier = await getUserTier()
  const cap = tier === 'anonymous' ? 3 : 100

  return NextResponse.json(((data ?? []) as NearbySpot[]).slice(0, cap))
}
