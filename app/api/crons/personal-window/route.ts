import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { toCatchSamples, type DbCatchRow } from '@/lib/scoring/personal/buckets'
import { computePersonalTendencies } from '@/lib/scoring/personal/tendencies'
import { matchPersonalWindow } from '@/lib/scoring/personal/window-match'
import { getDeptNextWindow } from '@/lib/conditions/dept-window'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Cron de la NOTIF PERSO PROACTIVE (sprint 26, WS-B, décision D-F2 : IN-APP SEUL).
//
// Le hook de conversion Local/Itinérant. La DONNÉE perso (tes tendances) reste
// GRATUITE partout (carnet, profil, fiche espèce) ; ce qu'on vend ici, c'est la
// PROACTIVITÉ : être prévenu quand le créneau favorable du jour coïncide avec les
// conditions où TES prises tombent. → on ne notifie QUE les abonnés (tier filtré
// en service_role via current_tier).
//
// ⚠️ CONTRAINTE 7.5 : la notif est DESCRIPTIVE (« tes prises tombent souvent le matin
// — créneau favorable aujourd'hui »), JAMAIS prédictive (« tu prendras »). La copie
// est composée dans matchPersonalWindow (pur, testé).
//
// ⚠️ Plan Vercel Hobby = 1 exécution/jour (07:00). Idempotence par jour : on n'envoie
// qu'UNE notif optimal_window par user et par jour (check created_at::date = today).
// Pas de nouvelle colonne : on s'appuie sur la notif elle-même comme marqueur.
//
// Écriture en service_role : INSERT direct dans notifications (pas createNotification,
// qui no-op sans acteur humain). Modèle = cron recfishing-reminders.

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const todayParis = parisDateKey(new Date())

    // Candidats : profils ayant un département de rattachement (sans dépt, pas de
    // créneau du jour calculable). Le filtre « a des prises » est fait par tendances.
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, home_department')
      .not('home_department', 'is', null)
    if (profErr) throw profErr

    let notified = 0
    let skipped = 0

    for (const p of profiles ?? []) {
      const userId = p.id as string
      const dept = (p.home_department as string | null)?.trim() || null
      if (!dept) {
        skipped++
        continue
      }

      // 1. Tier : on ne notifie QUE Local / Itinérant (la proactivité est le bénéfice payant).
      const { data: tier, error: tierErr } = await admin.rpc('current_tier', { uid: userId })
      if (tierErr) throw tierErr
      if (tier !== 'local' && tier !== 'itinerant') {
        skipped++
        continue
      }

      // 2. Idempotence : déjà une notif optimal_window aujourd'hui (heure de Paris) ?
      const { startUtc, endUtc } = parisDayBoundsUtc(todayParis)
      const { count: already, error: dupErr } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'optimal_window')
        .gte('created_at', startUtc)
        .lt('created_at', endUtc)
      if (dupErr) throw dupErr
      if ((already ?? 0) > 0) {
        skipped++
        continue
      }

      // 3. Tendances perso (vraies prises de l'user, service_role). Pas assez → skip.
      const { data: catches, error: catchErr } = await admin
        .from('catches')
        .select('species, spot_id, caught_at, wind_speed_kmh, tide_state, conditions')
        .eq('user_id', userId)
        .limit(2000)
      if (catchErr) throw catchErr

      const samples = toCatchSamples((catches ?? []) as DbCatchRow[])
      const tendencies = computePersonalTendencies(samples)
      if (!tendencies.hasEnough) {
        skipped++
        continue
      }

      // 4. Créneau favorable du jour pour son département. Indisponible → skip.
      const window = await getDeptNextWindow(dept)
      if (!window) {
        skipped++
        continue
      }

      // 5. Match : le créneau du jour coïncide-t-il avec TES conditions dominantes ?
      const match = matchPersonalWindow(tendencies, {
        startTimeISO: window.startTimeISO,
        endTimeISO: window.endTimeISO,
        score: window.score,
      })
      if (!match.shouldNotify || !match.previewText) {
        skipped++
        continue
      }

      // 6. INSERT direct service_role (sans actor_id : notif système, pas d'acteur humain).
      const { error: insErr } = await admin.from('notifications').insert({
        user_id: userId,
        type: 'optimal_window',
        target_type: 'spot',
        preview_text: match.previewText,
      })
      if (insErr) {
        console.error('[cron personal-window] insert notif échec (non bloquant) :', insErr)
        skipped++
        continue
      }
      notified++
    }

    return NextResponse.json({ ok: true, notified, skipped })
  } catch (err) {
    console.error('[cron personal-window] échec global:', err)
    Sentry.captureException(err, { tags: { job: 'personal-window' } })
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── Helpers dates « jour de Paris » ─────────────────────────────────────────
// Clé de jour (YYYY-MM-DD) en Europe/Paris pour l'idempotence — un run à 07:00 Paris
// doit raisonner sur le jour civil français, pas UTC.
function parisDateKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

// Bornes UTC [00:00, 24:00) du jour de Paris, pour filtrer created_at (stocké en UTC).
// On approxime l'offset Paris du jour via la différence locale↔UTC à midi (robuste été/hiver).
function parisDayBoundsUtc(dateKey: string): { startUtc: string; endUtc: string } {
  // Minuit de Paris ce jour-là, exprimé en UTC. On part de midi UTC du jour (jamais
  // ambigu), on lit l'heure de Paris correspondante, et on en déduit l'offset.
  const noonUtc = new Date(`${dateKey}T12:00:00Z`)
  const parisHourAtNoonUtc = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hour12: false,
    }).format(noonUtc),
  )
  // offset (heures) = heure de Paris - 12 (UTC). Ex. CEST → 14-12 = 2 ; CET → 13-12 = 1.
  const offsetH = parisHourAtNoonUtc - 12
  const startUtc = new Date(`${dateKey}T00:00:00Z`)
  startUtc.setUTCHours(startUtc.getUTCHours() - offsetH)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)
  return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() }
}
