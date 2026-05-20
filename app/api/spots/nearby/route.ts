import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  return NextResponse.json((data ?? []) as NearbySpot[])
}
