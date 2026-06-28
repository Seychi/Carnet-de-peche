import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAndStoreSpotScores } from '@/lib/scoring/spot-scores-job'

export const dynamic = 'force-dynamic'
// Borne du plan Hobby (60 s). Depuis le sprint 42, get_spots_for_scoring est scopée
// aux curés + communautaires (~215 spots, vs 1158 après l'import OSM qui timeoutait) :
// le job tient très largement sous 60 s. Les imports bruts sont hors périmètre.
export const maxDuration = 60

// Cron quotidien à 05:00 UTC (déclaré dans vercel.json — le plan Hobby de Vercel
// limite les crons à 1 exécution par jour). Vercel envoie automatiquement
// l'en-tête `Authorization: Bearer <CRON_SECRET>` si la var CRON_SECRET est
// définie sur le projet. On refuse tout appel non authentifié (fail-closed).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const result = await computeAndStoreSpotScores(admin)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron compute-spot-scores] échec global:', err)
    // Alerte Sentry explicite : la réponse 500 part vers Vercel Cron (pas un
    // navigateur), sans capture le crash serait invisible (brief Bloc D).
    Sentry.captureException(err, { tags: { job: 'compute-spot-scores' } })
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
