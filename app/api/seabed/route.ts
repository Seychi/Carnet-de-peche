import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserTier } from '@/lib/auth/tier'
import { fetchSeabedInfo } from '@/lib/conditions/bathymetry'

// Dépend du tier de l'utilisateur → jamais mis en cache partagé.
export const dynamic = 'force-dynamic'

// Lookup « Fond + Profondeur » à un point cliqué sur la carte. Couche avancée =
// réservée à l'offre Itinérant (cf docs/carte-v2/sprint-C3a + tarifs §8 CLAUDE.md).
// La donnée brute vient d'EMODnet (profondeur + substrat), agrégée côté serveur
// pour (1) éviter le CORS/quotas côté client, (2) bénéficier du cache 30 j.

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

export async function GET(request: NextRequest) {
  const tier = await getUserTier()
  if (tier !== 'itinerant') {
    // 403 = la couche fond marin est une fonctionnalité Itinérant. Le front
    // affiche un aperçu/upsell ; il ne doit pas appeler cette route hors Itinérant.
    return NextResponse.json({ error: 'tier', tier }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const parsed = querySchema.safeParse({
    lat: searchParams.get('lat'),
    lng: searchParams.get('lng'),
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const info = await fetchSeabedInfo(parsed.data.lat, parsed.data.lng)
  return NextResponse.json(info)
}
