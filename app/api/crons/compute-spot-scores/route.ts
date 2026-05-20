import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAndStoreSpotScores } from '@/lib/scoring/spot-scores-job'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Cron horaire (déclaré dans vercel.json). Vercel envoie automatiquement
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
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
