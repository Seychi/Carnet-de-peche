import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAnonClient } from '@/lib/supabase/anon'
import { getUserTier } from '@/lib/auth/tier'
import { getPersonalTendencies } from '@/lib/scoring/personal'
import { buildSpotWeek } from '@/lib/spots/week'
import {
  ANONYMOUS_VIEWER,
  type SpotViewerPayload,
  type ViewerActivityCatch,
  type ViewerCatch,
} from '@/lib/spots/viewer'

/**
 * Delta connecté d'une fiche spot (sprint 84, Bloc 3).
 *
 * La page `/spots/[slug]` est statique et rend la variante ANONYME. Cette route
 * rend à un visiteur connecté tout ce qu'il avait avant le sprint et que le HTML
 * mis en cache ne peut pas porter : coordonnée précise (si la BASE la lui accorde),
 * frise 7 jours, prises complètes, favori, confirmation, tendances perso.
 *
 * 🔒 Trois choses à ne pas casser ici :
 * 1. `force-dynamic` + `no-store` : ce payload est personnel, il ne doit JAMAIS
 *    atterrir dans un cache partagé.
 * 2. La coordonnée précise vient de `get_spot_by_slug` appelée avec le client de
 *    SESSION. C'est Postgres qui décide (`current_tier` + département + propriétaire,
 *    SECURITY DEFINER) : cette route ne fait que transmettre. Ne jamais reconstituer
 *    une précision ici, ni lire `spots.geom` (les grants de colonne 028b/041
 *    l'interdisent de toute façon à `authenticated`).
 * 3. La semaine est calculée sur la coordonnée ANONYME (client sans cookies), la
 *    même que celle du rendu statique : le jour 1 de la frise doit coïncider au
 *    chiffre près avec le score déjà affiché, et le cache Open-Meteo reste unique
 *    par spot au lieu de se dédoubler par palier.
 */
export const dynamic = 'force-dynamic'

const NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0',
} as const

function json(payload: SpotViewerPayload, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Anonyme : rien à ajouter au HTML statique, qui est déjà SA version.
  if (!user) return json(ANONYMOUS_VIEWER)

  // Vue GATÉE du spot (session) : c'est elle qui porte `is_precise`.
  const { data: gatedRows } = await supabase.rpc('get_spot_by_slug', { p_slug: slug })
  const gated = Array.isArray(gatedRows) ? gatedRows[0] : null
  if (!gated) return json(ANONYMOUS_VIEWER, 404)

  const spotId = gated.id as string
  const department = String(gated.department ?? '').trim()

  // Coordonnée ANONYME : sert de base de calcul à la semaine (même clé de cache que
  // le rendu statique). Si la lecture anonyme échoue, on retombe sur la gatée : le
  // pire cas est une clé de cache Open-Meteo distincte, jamais une fuite.
  const anon = createAnonClient()
  const { data: anonRows } = await anon.rpc('get_spot_by_slug', { p_slug: slug })
  const anonSpot = (Array.isArray(anonRows) ? anonRows[0] : null) ?? gated

  const [tier, favorite, confirmed, tendencies, week, catches, activity] = await Promise.all([
    getUserTier().catch(() => 'discovery' as const),

    supabase
      .from('favorite_spots')
      .select('spot_id')
      .eq('spot_id', spotId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => data != null)
      .then(undefined, () => false),

    supabase
      .from('spot_confirmations')
      .select('id')
      .eq('spot_id', spotId)
      .maybeSingle()
      .then(({ data }) => data != null)
      .then(undefined, () => false),

    getPersonalTendencies({ spotId }).catch(() => null),

    buildSpotWeek(
      anonSpot.lat as number,
      anonSpot.lng as number,
      department,
    ).catch(() => null),

    supabase
      .from('catches_for_viewer')
      .select('id, species, size_cm, weight_g, caught_at, username, display_name')
      .eq('spot_id', spotId)
      .eq('privacy', 'public')
      .order('caught_at', { ascending: false })
      .limit(5)
      .then(({ data }) => (data ?? []) as ViewerCatch[])
      .then(undefined, () => [] as ViewerCatch[]),

    supabase
      .rpc('get_spot_activity', { p_spot_id: spotId, p_days: 7 })
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data
        return ((row?.recent_catches ?? []) as ViewerActivityCatch[])
      })
      .then(undefined, () => [] as ViewerActivityCatch[]),
  ])

  return json({
    authed: true,
    tier: tier as SpotViewerPayload['tier'],
    favorite,
    confirmed,
    // ⚠️ `is_precise` vient de la RPC gatée, jamais d'un calcul local.
    precise: gated.is_precise
      ? { lat: gated.lat as number, lng: gated.lng as number }
      : null,
    week: week
      ? {
          weekly: week.weekly,
          weatherCodes: week.weatherCodes,
          tidesByDate: week.tidesByDate,
          marnageDays: week.marnageDays,
        }
      : null,
    catches,
    activity,
    tendencies,
  })
}
