import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFacadeForCatch } from '@/lib/regulation'
import { getDeclarableInfo, DECLARABLE_DB_KEYS, RECFISHING_META } from '@/lib/regulation/recfishing'
import { sendPushToUser } from '@/lib/push/send'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// Runtime Node implicite (aucun `export const runtime = 'edge'`) : requis car
// createAdminClient + web-push (via sendPushToUser) ont besoin du crypto Node.
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

    // ─── Bloc co-pêchage (sprint 40, WS-C — décision John D2 : FUSION, pas de 5e cron) ──
    // Greffé ici (même créneau du soir) : rappel la veille des sorties de demain +
    // dérivation cheap du statut 'done' (D3). BEST-EFFORT STRICT : un échec ici ne
    // casse jamais le bloc recfishing ci-dessus (déjà terminé) ni la réponse.
    let outingsReminded = 0
    let outingsDone = 0
    try {
      const out = await runOutingReminders(admin)
      outingsReminded = out.reminded
      outingsDone = out.done
    } catch (e) {
      // Filet global du bloc sortie : ne propage jamais (le cron recfishing reste un succès).
      console.error('[cron recfishing-reminders] bloc co-pêchage échec (non bloquant) :', e)
      Sentry.captureException(e, { tags: { job: 'outing-reminders' } })
    }

    return NextResponse.json({
      ok: true,
      candidates: rows.length,
      reminded,
      outingsReminded,
      outingsDone,
    })
  } catch (err) {
    console.error('[cron recfishing-reminders] échec global:', err)
    Sentry.captureException(err, { tags: { job: 'recfishing-reminders' } })
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── Rappel la veille d'une sortie de co-pêchage (sprint 40, WS-C) ─────────────
// Sélectionne les sorties dont `planned_at` tombe DEMAIN (jour civil français,
// Europe/Paris), encore actives (open/full) et jamais rappelées (reminded_at null).
// Pour chaque sortie : notifie les participants ACCEPTÉS + l'hôte (lui aussi veut
// le rappel), in-app + push (best-effort), puis pose reminded_at = now() (anti-doublon
// strict : relancer le cron le même jour ne re-notifie pas). Marque aussi `done` les
// sorties passées (dérivation cheap, décision John D3).
//
// INVARIANTS : zéro coordonnée dans la notif/le push (libellé = area_label + dépt
// texte, la table n'a de toute façon aucun geom). Pas de tier gating (un gratuit
// reçoit aussi le rappel). Best-effort : chaque insert/push est isolé, jamais throw.
async function runOutingReminders(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ reminded: number; done: number }> {
  // 1. Marquer `done` les sorties passées (D3) — cheap, avant de chercher « demain ».
  //    Seules les sorties encore actives basculent (on ne touche pas cancelled).
  //    `.select('id')` après l'update renvoie les lignes modifiées → on en compte la longueur.
  let done = 0
  const { data: doneRows, error: doneErr } = await admin
    .from('outing_proposals')
    .update({ status: 'done' })
    .lt('planned_at', new Date().toISOString())
    .in('status', ['open', 'full'])
    .select('id')
  if (doneErr) {
    console.error('[cron outing] passage done échec (non bloquant) :', doneErr.message)
  } else {
    done = doneRows?.length ?? 0
  }

  // 2. Bornes UTC du jour de DEMAIN en Europe/Paris (planned_at stocké en UTC).
  const { startUtc, endUtc } = parisTomorrowBoundsUtc(new Date())

  // 3. Sorties planifiées demain, encore actives, jamais rappelées.
  const { data: proposals, error: propErr } = await admin
    .from('outing_proposals')
    .select('id, host_id, department, area_label, planned_at')
    .gte('planned_at', startUtc)
    .lt('planned_at', endUtc)
    .in('status', ['open', 'full'])
    .is('reminded_at', null)
  if (propErr) {
    console.error('[cron outing] lecture sorties échec (non bloquant) :', propErr.message)
    return { reminded: 0, done }
  }

  let reminded = 0
  for (const p of proposals ?? []) {
    const proposalId = p.id as string
    const hostId = p.host_id as string
    const dept = (p.department as string | null)?.trim() ?? ''
    const areaLabel = (p.area_label as string | null)?.trim() || null

    // Libellé SANS coordonnée : area_label si fourni, sinon le nom du département.
    const deptName = DEPARTMENT_LABELS[dept] ?? dept
    const lieu = areaLabel ? `${areaLabel} (${deptName})` : deptName
    const preview = `Ta sortie de demain à ${lieu}.`

    // Destinataires : participants acceptés + l'hôte (dédupliqués). L'hôte veut aussi
    // le rappel de SA sortie ; un Set évite de le notifier deux fois s'il figure aussi
    // (improbable) côté participants.
    const recipients = new Set<string>()
    if (hostId) recipients.add(hostId)

    const { data: parts, error: partErr } = await admin
      .from('outing_participants')
      .select('user_id')
      .eq('proposal_id', proposalId)
      .eq('status', 'accepted')
    if (partErr) {
      console.error('[cron outing] lecture participants échec (non bloquant) :', partErr.message)
      // On continue quand même : au moins l'hôte sera rappelé.
    } else {
      for (const part of parts ?? []) {
        const uid = part.user_id as string | null
        if (uid) recipients.add(uid)
      }
    }

    // Notif in-app (service_role, sans actor_id : notif système) + push, par destinataire.
    // Chaque envoi est isolé : un échec ne saute pas les autres destinataires.
    for (const userId of recipients) {
      try {
        const { error: insErr } = await admin.from('notifications').insert({
          user_id: userId,
          type: 'outing_reminder',
          target_type: 'outing',
          target_id: proposalId,
          preview_text: preview.slice(0, 140),
        })
        if (insErr) {
          console.error('[cron outing] insert notif échec (non bloquant) :', insErr.message)
        }
      } catch (e) {
        console.error('[cron outing] insert notif exception (non bloquant) :', e)
      }

      // Push best-effort (no-op sans clés VAPID ; sendPushToUser ne throw déjà jamais).
      try {
        await sendPushToUser(admin, userId, {
          title: 'Carnet de Pêche',
          body: preview,
          url: '/sorties',
        })
      } catch (e) {
        console.error('[cron outing] push best-effort (non bloquant) :', e)
      }
    }

    // Anti-doublon : la sortie est marquée rappelée (une seule fois), quoi qu'il arrive
    // côté notifs/push (best-effort). Un re-run le même jour ne re-notifiera pas.
    try {
      const { error: markErr } = await admin
        .from('outing_proposals')
        .update({ reminded_at: new Date().toISOString() })
        .eq('id', proposalId)
      if (markErr) {
        console.error('[cron outing] marquage reminded_at échec (non bloquant) :', markErr.message)
      }
    } catch (e) {
      console.error('[cron outing] marquage reminded_at exception (non bloquant) :', e)
    }

    reminded++
  }

  return { reminded, done }
}

// Bornes UTC [00:00, 24:00) du jour de DEMAIN en Europe/Paris, pour filtrer
// outing_proposals.planned_at (stocké en UTC). Calqué sur parisDayBoundsUtc du cron
// personal-window : on déduit l'offset Paris du jour via l'heure de Paris à midi UTC
// (robuste été/hiver), puis on décale minuit Paris de DEMAIN vers UTC.
function parisTomorrowBoundsUtc(now: Date): { startUtc: string; endUtc: string } {
  // Clé de jour (YYYY-MM-DD) de DEMAIN en Europe/Paris. On ajoute ~26 h à maintenant
  // puis on lit le jour civil de Paris : robuste aux changements d'heure (la marge
  // 24 h pure pourrait, un jour de bascule, retomber sur aujourd'hui).
  const tomorrowKey = parisDateKey(new Date(now.getTime() + 26 * 60 * 60 * 1000))

  // Offset Paris du jour de demain (heures) via l'heure de Paris à midi UTC.
  const noonUtc = new Date(`${tomorrowKey}T12:00:00Z`)
  const parisHourAtNoonUtc = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hour12: false,
    }).format(noonUtc),
  )
  const offsetH = parisHourAtNoonUtc - 12 // CEST → 2 ; CET → 1.

  const startUtc = new Date(`${tomorrowKey}T00:00:00Z`)
  startUtc.setUTCHours(startUtc.getUTCHours() - offsetH)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)
  return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() }
}

// Clé de jour (YYYY-MM-DD) en Europe/Paris.
function parisDateKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((part) => part.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
