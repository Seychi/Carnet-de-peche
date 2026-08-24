import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAndStoreSpotScores } from '@/lib/scoring/spot-scores-job'

export const dynamic = 'force-dynamic'
// ★ Sprint 89 — 300 s, et non plus 60.
//
// Le commentaire précédent bornait à 60 s « le plan Hobby ». Il était PÉRIMÉ :
// vérifié le 19/08/2026 via l'API Vercel, l'équipe `seychis-projects` est en plan
// **pro**, où `maxDuration` monte à 300 s. Le signe qui aurait dû alerter est dans
// `vercel.json` : 4 crons à horaires quotidiens distincts, ce que Hobby n'autorise
// pas (2 crons maximum).
//
// Ce que ça garde ouvert : c'est désormais une marge de sécurité, pas un besoin.
// Depuis que la météo est récupérée en appels groupés (10 requêtes pour tout le
// catalogue au lieu de 424, cf `fetchSpotForecastWeekBatch`), le job mesuré tient
// en ~2 s d'appels réseau. Les 300 s couvrent le jour où le catalogue triple ou
// où Open-Meteo répond lentement, sans qu'on ait à y revenir.
export const maxDuration = 300

// Cron quotidien à 05:00 UTC (déclaré dans vercel.json).
//
// ⚠️ Le motif « le plan Hobby limite les crons à 1 exécution par jour » qui traînait
// ici est FAUX : le projet est en plan pro (vérifié via l'API Vercel le 19/08/2026),
// où la fréquence est libre. Rien n'empêche techniquement de passer à 2 runs par
// jour, ce qui réduirait d'autant la fenêtre pendant laquelle un spot garde un
// score vieux de 26 h. C'est une décision à prendre, pas une contrainte subie.
//
// Vercel envoie automatiquement
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
