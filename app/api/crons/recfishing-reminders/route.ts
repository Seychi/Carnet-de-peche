import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFacadeForCatch } from '@/lib/regulation'
import { getDeclarableInfo, DECLARABLE_DB_KEYS, RECFISHING_META } from '@/lib/regulation/recfishing'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Rappel RecFishing : crée une notification in-app pour les prises d'espèces
// sensibles non encore déclarées, afin que le pêcheur déclare dans les 24 h.
// ⚠️ Plan Vercel Hobby = 1 exécution/jour max par cron → le rappel arrive au plus
// tard le lendemain. Le BANDEAU sur la fiche prise reste le rappel immédiat ; ce
// cron n'est qu'un nudge secondaire (badge notif). Fenêtre 48 h pour rattraper.
// On ne déclare JAMAIS à la place de l'utilisateur (pas d'API RecFishing).

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data, error } = await admin.rpc('get_pending_recfishing_catches', {
      p_since: since,
      p_species: DECLARABLE_DB_KEYS,
    })

    if (error) throw error
    const rows = data ?? []

    let reminded = 0
    for (const row of rows) {
      // Façade tranchée côté serveur : département du spot prioritaire, sinon géoloc.
      const facade = getFacadeForCatch({ department: row.department, lat: row.lat, lng: row.lng })
      if (!facade) continue
      const info = getDeclarableInfo(row.species, facade)
      if (!info) continue // espèce non sensible sur cette façade → pas de rappel

      // Notification de rappel (service-role bypasse la RLS insert-service-only).
      const { error: notifError } = await admin.from('notifications').insert({
        user_id: row.user_id,
        type: 'recfishing_reminder',
        target_type: 'catch',
        target_id: row.id,
        preview_text: `Pense à déclarer ton ${info.commonFr.toLowerCase()} sur RecFishing (sous ${RECFISHING_META.deadlineHours} h).`,
      })
      if (notifError) {
        console.error('[cron recfishing] insert notif échec (non bloquant) :', notifError)
        continue
      }

      // Anti-doublon : marque la prise comme rappelée.
      await admin.from('catches').update({ recfishing_reminded_at: new Date().toISOString() }).eq('id', row.id)
      reminded++
    }

    return NextResponse.json({ ok: true, candidates: rows.length, reminded })
  } catch (err) {
    console.error('[cron recfishing-reminders] échec global:', err)
    Sentry.captureException(err, { tags: { job: 'recfishing-reminders' } })
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
