import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { toCatchSamples, type DbCatchRow } from '@/lib/scoring/personal/buckets'
import { computePersonalTendencies } from '@/lib/scoring/personal/tendencies'
import { matchPersonalWindow } from '@/lib/scoring/personal/window-match'
import { getDeptNextWindow, getDeptUpcomingWindows } from '@/lib/conditions/dept-window'
// ℹ️ Sprint 70 Bloc B : le warning `url.parse() deprecated` (DEP0169) visible dans les
// logs Vercel de ce cron ne vient PAS de ce fichier (aucun url.parse dans app/lib/components,
// vérifié par grep) mais de la dépendance web-push@3.6.7 (src/web-push-lib.js:274,348),
// appelée via sendPushToUser. Dernière version publiée au 02/07 → pas d'upgrade dispo ;
// fix possible plus tard via `pnpm patch web-push` (package.json gelé ce sprint).
import { sendPushToUser } from '@/lib/push/send'
import { isNotificationPrefEnabled } from '@/lib/notifications/prefs-meta'
import { getBigTideForDay, bigTidePreviewText } from '@/lib/notifications/big-tide'
import { getUpcomingClosuresForFavorites } from '@/lib/notifications/species-closure'
import { composeWeeklyDigest, type DigestCatchRow } from '@/lib/notifications/weekly-digest'
import { emitSeasonRecapNotifications, type SeasonRecapRow } from '@/lib/notifications/season-recap'
import { runLifecycleGreffon } from '@/lib/lifecycle/cron'

// Runtime Node implicite (aucun `export const runtime = 'edge'`) : requis car
// createAdminClient + web-push (via sendPushToUser) ont besoin du crypto Node.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Budget du greffon lifecycle (sprint 74). Le legacy (notifs perso + greffons S49/S63/S67)
// tourne AVANT et n'est jamais décalé ; l'envoi d'emails s'arrête proprement à cette borne
// pour laisser ~15 s de marge sous maxDuration. Ce qui n'est pas parti repart demain.
const LIFECYCLE_BUDGET_MS = 45_000

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
    const startedAt = Date.now()
    const admin = createAdminClient()
    const todayParis = parisDateKey(new Date())

    // ─── Bascule de saison (sprint 67, PAS de 5e cron : greffon de ce cron quotidien) ──
    // Archive la saison PRÉCÉDENTE (offset -1) : podium figé (national/département × 4
    // métriques) + badge « Champion de saison » (national XP #1), puis notifie les finalistes
    // du board flagship. Idempotent (ON CONFLICT dans archive_season) → rejoué chaque jour
    // sans doublon ; n'agit qu'au 1er passage suivant une bascule (les autres jours = no-op :
    // aucune ligne fraîche → aucune notif). Best-effort STRICT (n'interrompt jamais le cron).
    let seasonRecaps = 0
    try {
      const { data: fresh, error: archErr } = await admin.rpc('archive_season', { p_offset: -1 })
      if (archErr) throw new Error(archErr.message)
      const { inApp } = await emitSeasonRecapNotifications(admin, (fresh ?? []) as SeasonRecapRow[])
      seasonRecaps = inApp
    } catch (e) {
      console.error('[cron personal-window] archive-season greffon (non bloquant) :', e)
    }

    // Candidats : profils ayant un département de rattachement (sans dépt, pas de
    // créneau du jour calculable). Le filtre « a des prises » est fait par tendances.
    // `favorite_species` + `notification_prefs` servent les greffons sprint 49
    // (fermeture d'espèce / gate des push par type).
    const { data: profiles, error: profErr } = await admin
      .from('profiles')
      .select('id, home_department, favorite_species, notification_prefs')
      .not('home_department', 'is', null)
    if (profErr) throw profErr

    let notified = 0
    let skipped = 0
    // Compteurs des greffons sprint 49 (push & engagement), reportés dans la réponse.
    let bigTides = 0
    let closures = 0
    let digests = 0
    let streakDangers = 0
    const isWeeklyDigestDay = parisIsWeekday(new Date(), DIGEST_WEEKDAY)

    for (const p of profiles ?? []) {
      const userId = p.id as string
      const dept = (p.home_department as string | null)?.trim() || null
      // Préférences push du destinataire (gate par type ; absent = activé).
      const prefs =
        p.notification_prefs && typeof p.notification_prefs === 'object' && !Array.isArray(p.notification_prefs)
          ? (p.notification_prefs as Record<string, unknown>)
          : {}
      const favoriteSpecies = (p.favorite_species as string[] | null) ?? []
      if (!dept) {
        skipped++
        continue
      }

      // ─── Greffon big-tide (sprint 49, tous tiers — décision D1) ────────────────
      // AVANT le gate de tier optimal_window : la grande marée est ouverte au gratuit.
      // fetchSpotForecastWeek est caché 1h ET keyé par lat/lng → au plus 1 fetch par
      // DÉPARTEMENT pour tout le run (le même forecast sert big-tide + le créneau
      // optimal_window). Idempotence/jour calquée sur optimal_window.
      try {
        const sent = await runBigTideGreffon(admin, userId, dept, prefs, todayParis)
        if (sent) bigTides++
      } catch (e) {
        console.error('[cron personal-window] big-tide greffon (non bloquant) :', e)
      }

      // ─── Greffon fermeture d'espèce (sprint 49) ────────────────────────────────
      // 100 % en mémoire (réglementation sourcée). Idempotence : pas deux fois la même
      // fermeture d'espèce dans la fenêtre J-N (on borne sur 30 j glissants).
      try {
        const sent = await runClosureGreffon(admin, userId, favoriteSpecies, prefs)
        closures += sent
      } catch (e) {
        console.error('[cron personal-window] closure greffon (non bloquant) :', e)
      }

      // ─── Greffon récap hebdo (sprint 49, WS B) ─────────────────────────────────
      // Un seul jour de semaine → 1×/semaine. Idempotence/semaine (compte avant envoi).
      if (isWeeklyDigestDay) {
        try {
          const sent = await runWeeklyDigestGreffon(admin, userId, dept, prefs)
          if (sent) digests++
        } catch (e) {
          console.error('[cron personal-window] digest greffon (non bloquant) :', e)
        }
      }

      // ─── Greffon série en danger (sprint 63, tous tiers, solo) ─────────────────
      // Dimanche (Paris) = dernier jour de la semaine ISO : si la série est active ET la
      // semaine encore vide, un rappel DOUX (au plus 1×/semaine, idempotent). Timing
      // MATINAL assumé (ce cron tourne à ~07:00 ; pas de cron du soir dédié, cf RECAP S63).
      try {
        const sent = await runStreakDangerGreffon(admin, userId, prefs, new Date())
        if (sent) streakDangers++
      } catch (e) {
        console.error('[cron personal-window] streak-danger greffon (non bloquant) :', e)
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

      // 7. Push (best-effort) EN PLUS de la notif in-app. Suit la notif in-app
      // (donc gate de tier + idempotence/jour déjà respectés → 1 push/jour max).
      // Gate par pref 'optimal_window' (sprint 49) : si l'utilisateur a coupé ce type,
      // on garde la notif in-app mais on n'envoie pas le push. Un échec d'envoi ne casse
      // ni la boucle ni l'insert in-app (try/catch isolé ; sendPushToUser ne throw déjà
      // jamais et no-op sans clés VAPID).
      if (isNotificationPrefEnabled(prefs, 'optimal_window')) {
        try {
          await sendPushToUser(admin, userId, {
            title: 'Carnet de Pêche',
            body: match.previewText,
            url: '/carte',
          })
        } catch (e) {
          console.error('[cron personal-window] push best-effort', e)
        }
      }

      notified++
    }

    // ─── Greffon LIFECYCLE (sprint 74, PAS de 5e cron) ─────────────────────────
    // Emails d'activation J+1 / J+3 + hebdo du vendredi. Placé APRÈS la boucle
    // legacy (qui n'est donc jamais décalée) et en requêtes groupées : son coût DB
    // ne dépend pas du nombre d'inscrits. Best-effort STRICT et time-boxé : ne
    // renvoie jamais d'exception, s'arrête proprement si le budget est consommé.
    let lifecycle: Awaited<ReturnType<typeof runLifecycleGreffon>> = {
      j1: 0,
      j3: 0,
      weekly: 0,
      failed: 0,
      timedOut: false,
    }
    try {
      lifecycle = await runLifecycleGreffon(admin, new Date(), startedAt + LIFECYCLE_BUDGET_MS)
    } catch (e) {
      // runLifecycleGreffon ne throw pas par design ; ceinture et bretelles, comme
      // pour tous les autres greffons de ce cron.
      console.error('[cron personal-window] lifecycle greffon (non bloquant) :', e)
    }

    return NextResponse.json({ ok: true, notified, skipped, bigTides, closures, digests, streakDangers, seasonRecaps, lifecycle })
  } catch (err) {
    console.error('[cron personal-window] échec global:', err)
    Sentry.captureException(err, { tags: { job: 'personal-window' } })
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GREFFONS SPRINT 49 « Push & engagement » (PAS de 5e cron : tout vit dans ce cron
// quotidien ~07:00). Chaque greffon est BEST-EFFORT (isolé par try/catch dans la
// boucle), respecte SA pref (prefs->>'<key>') ET le master switch push (sendPushToUser
// no-op sans abonnement/clés), et compte AVANT d'envoyer (idempotence).
// ═══════════════════════════════════════════════════════════════════════════════

// Jour de semaine du récap hebdo (1 = lundi … 7 = dimanche, norme ISO). Lundi = on
// récapitule la semaine écoulée. Un seul jour → 1 digest/semaine au plus.
const DIGEST_WEEKDAY = 1

/**
 * Greffon GRANDE MARÉE (tous tiers, décision D1). Push « grande marée aujourd'hui »
 * quand le marnage RÉEL du jour (extrema) dépasse le seuil de la façade (D2). In-app
 * + push, idempotence/jour (type 'big_tide'), gate pref 'big_tide'. Renvoie true si
 * une notif a été créée. Zéro appel réseau en plus (forecast caché 1h).
 */
async function runBigTideGreffon(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  dept: string,
  prefs: Record<string, unknown>,
  todayParis: string,
): Promise<boolean> {
  // Marnage réel du jour + dépassement de seuil (null = pas une grande marée / Médée).
  const bigTide = await getBigTideForDay(dept)
  if (!bigTide) return false

  // Idempotence/jour : déjà une notif big_tide aujourd'hui (heure de Paris) ? Compte
  // AVANT d'envoyer (modèle optimal_window).
  const { startUtc, endUtc } = parisDayBoundsUtc(todayParis)
  const { count: already, error: dupErr } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'big_tide')
    .gte('created_at', startUtc)
    .lt('created_at', endUtc)
  if (dupErr) {
    console.error('[cron big-tide] idempotence échec (non bloquant) :', dupErr.message)
    return false
  }
  if ((already ?? 0) > 0) return false

  const preview = bigTidePreviewText(bigTide.rangeM)

  // In-app TOUJOURS (système, sans actor_id). La grande marée vaut le badge même push off.
  const { error: insErr } = await admin.from('notifications').insert({
    user_id: userId,
    type: 'big_tide',
    target_type: 'spot',
    preview_text: preview.slice(0, 140),
  })
  if (insErr) {
    console.error('[cron big-tide] insert notif échec (non bloquant) :', insErr.message)
    return false
  }

  // Push best-effort, gaté pref 'big_tide' + master switch (no-op sans clés/abonnement).
  if (isNotificationPrefEnabled(prefs, 'big_tide')) {
    try {
      await sendPushToUser(admin, userId, {
        title: 'Carnet de Pêche',
        body: preview,
        url: '/carte',
      })
    } catch (e) {
      console.error('[cron big-tide] push best-effort (non bloquant) :', e)
    }
  }
  return true
}

/**
 * Greffon FERMETURE D'ESPÈCE. Pour chaque espèce favorite dont la fermeture COMMENCE
 * dans la fenêtre J-N (réglementation sourcée), push « la fermeture du X commence
 * bientôt ». In-app + push (gate pref 'species_closure'). Idempotence : pas deux fois
 * la même fermeture d'espèce dans une fenêtre de 30 jours glissants (le 1er du mois
 * de fermeture n'apparaît qu'une fois dans la fenêtre J-N). Renvoie le nb de notifs.
 */
async function runClosureGreffon(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  favoriteDbKeys: string[],
  prefs: Record<string, unknown>,
): Promise<number> {
  const upcoming = getUpcomingClosuresForFavorites(favoriteDbKeys)
  if (upcoming.length === 0) return 0

  // Anti-doublon : on n'a pas de colonne d'idempotence dédiée. On borne sur 30 jours
  // glissants — la fenêtre J-N (7 j) garantit qu'une fermeture donnée n'est éligible
  // qu'une courte période ; 30 j couvre largement sans re-notifier le mois suivant.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let sent = 0
  for (const closure of upcoming) {
    const preview = closure.previewText.slice(0, 140)

    // Idempotence per-espèce : déjà une notif species_closure récente AVEC CE preview_text
    // exact ? On ne peut PAS keyer sur target_id (colonne uuid en DB, migration 037) → on
    // déduplique sur le texte déterministe (une copie unique par espèce). Compte avant envoi.
    const { count: already, error: dupErr } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'species_closure')
      .eq('preview_text', preview)
      .gte('created_at', since)
    if (dupErr) {
      console.error('[cron closure] idempotence échec (non bloquant) :', dupErr.message)
      continue
    }
    if ((already ?? 0) > 0) continue

    // In-app TOUJOURS. Pas de target_type/target_id (la migration 085 prévoit
    // species_closure→null ; la cible utile, l'espèce, est dans preview_text + l'URL
    // du push pointe sa fiche). target_id est uuid en DB → un slug y serait invalide.
    const { error: insErr } = await admin.from('notifications').insert({
      user_id: userId,
      type: 'species_closure',
      preview_text: preview,
    })
    if (insErr) {
      console.error('[cron closure] insert notif échec (non bloquant) :', insErr.message)
      continue
    }

    if (isNotificationPrefEnabled(prefs, 'species_closure')) {
      try {
        await sendPushToUser(admin, userId, {
          title: 'Carnet de Pêche',
          body: closure.previewText,
          url: `/especes/${closure.slug}`,
        })
      } catch (e) {
        console.error('[cron closure] push best-effort (non bloquant) :', e)
      }
    }
    sent++
  }
  return sent
}

/**
 * Greffon RÉCAP HEBDO (WS B). Composé une fois par semaine (jour DIGEST_WEEKDAY) :
 * N prises des 7 derniers jours + la plus belle + N fenêtres favorables à venir.
 * In-app + push (gate pref 'weekly_digest'). Idempotence/SEMAINE : on compte les
 * digests des 7 derniers jours avant d'envoyer. Renvoie true si une notif a été créée.
 */
async function runWeeklyDigestGreffon(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  dept: string,
  prefs: Record<string, unknown>,
): Promise<boolean> {
  // Idempotence/semaine : déjà un digest dans les 7 derniers jours ? (fenêtre glissante
  // robuste même si le cron tourne deux fois le jour J). Compte AVANT d'envoyer.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: already, error: dupErr } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'weekly_digest')
    .gte('created_at', weekAgo)
  if (dupErr) {
    console.error('[cron digest] idempotence échec (non bloquant) :', dupErr.message)
    return false
  }
  if ((already ?? 0) > 0) return false

  // Prises des 7 derniers jours (service_role, scopé user_id). Légère (3 colonnes).
  const { data: catches, error: catchErr } = await admin
    .from('catches')
    .select('species, size_cm, measured_length_cm')
    .eq('user_id', userId)
    .gte('caught_at', weekAgo)
    .limit(500)
  if (catchErr) {
    console.error('[cron digest] lecture prises échec (non bloquant) :', catchErr.message)
    return false
  }

  // Fenêtres favorables à venir (cette semaine) pour le département — pipeline caché
  // (même cache `spot-forecast-week` que getDeptNextWindow → zéro appel réseau en plus).
  const upcoming = await getDeptUpcomingWindows(dept, 3)

  const digest = composeWeeklyDigest({
    catches: (catches ?? []) as DigestCatchRow[],
    upcomingWindowsCount: upcoming.length,
  })
  if (!digest) return false // rien à dire (0 prise ET 0 fenêtre) → pas de digest vide.

  // Pas de target_type/target_id (migration 085 prévoit weekly_digest→null) ; le push
  // mène au cockpit /home où le récap prend tout son sens.
  const { error: insErr } = await admin.from('notifications').insert({
    user_id: userId,
    type: 'weekly_digest',
    preview_text: digest.previewText.slice(0, 140),
  })
  if (insErr) {
    console.error('[cron digest] insert notif échec (non bloquant) :', insErr.message)
    return false
  }

  if (isNotificationPrefEnabled(prefs, 'weekly_digest')) {
    try {
      await sendPushToUser(admin, userId, {
        title: 'Carnet de Pêche',
        body: digest.previewText,
        url: '/home',
      })
    } catch (e) {
      console.error('[cron digest] push best-effort (non bloquant) :', e)
    }
  }
  return true
}

/**
 * Greffon SÉRIE EN DANGER (sprint 63, tous tiers, solo). Le DIMANCHE (dernier jour de la
 * semaine ISO, heure de Paris) : si la série en cours est active (> 0) ET qu'aucune prise
 * ni sortie n'a été loguée cette semaine ISO, un rappel DOUX (jamais culpabilisant). In-app
 * + push (gate pref 'streak_reminder'). Idempotence : pas deux fois en 6 jours (donc au plus
 * 1×/semaine). Renvoie true si une notif a été créée. AUCUNE comparaison inter-pêcheurs.
 */
async function runStreakDangerGreffon(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  prefs: Record<string, unknown>,
  now: Date,
): Promise<boolean> {
  // Uniquement le dernier jour de la semaine ISO (dimanche) → cadence ≤ 1/semaine.
  if (!parisIsWeekday(now, 7)) return false

  // Série EN COURS (entier) via la RPC definer (agrégat, aucune fuite de prise/spot).
  const { data: streakVal, error: streakErr } = await admin.rpc('get_user_streak', {
    p_user_id: userId,
  })
  if (streakErr) {
    console.error('[cron streak-danger] lecture série échec (non bloquant) :', streakErr.message)
    return false
  }
  const streak = Number(streakVal) || 0
  if (streak <= 0) return false // pas de série active → rien à sauver

  // Semaine ISO en cours = lundi 00:00 Paris (on est dimanche → lundi = J-6).
  const monday = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  const { startUtc: weekStartUtc } = parisDayBoundsUtc(parisDateKey(monday))

  // Déjà une activité cette semaine (prise OU sortie) ? → série déjà validée, pas de danger.
  const [{ count: catchCount, error: cErr }, { count: outingCount, error: oErr }] =
    await Promise.all([
      admin
        .from('catches')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('caught_at', weekStartUtc),
      admin
        .from('outings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('started_at', weekStartUtc),
    ])
  if (cErr || oErr) {
    console.error(
      '[cron streak-danger] lecture activité échec (non bloquant) :',
      cErr?.message ?? oErr?.message,
    )
    return false
  }
  if ((catchCount ?? 0) + (outingCount ?? 0) > 0) return false

  // Idempotence : pas de streak_danger dans les 6 derniers jours (→ au plus 1/semaine).
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
  const { count: already, error: dupErr } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'streak_danger')
    .gte('created_at', sixDaysAgo)
  if (dupErr) {
    console.error('[cron streak-danger] idempotence échec (non bloquant) :', dupErr.message)
    return false
  }
  if ((already ?? 0) > 0) return false

  // Copie HONNÊTE : on ne promet pas une perte certaine (un joker mensuel peut couvrir une
  // semaine sautée, cf StreakCard/mig. 099) → formulation positive, sans « tu vas tout perdre ».
  const preview = `Ta série de ${streak} semaine${
    streak > 1 ? 's' : ''
  } attend un petit geste cette semaine. Une prise ou une sortie suffit.`

  // In-app TOUJOURS (système, sans actor_id).
  const { error: insErr } = await admin.from('notifications').insert({
    user_id: userId,
    type: 'streak_danger',
    preview_text: preview.slice(0, 140),
  })
  if (insErr) {
    console.error('[cron streak-danger] insert notif échec (non bloquant) :', insErr.message)
    return false
  }

  // Push best-effort, gaté pref 'streak_reminder' + master switch (no-op sans clés).
  if (isNotificationPrefEnabled(prefs, 'streak_reminder')) {
    try {
      await sendPushToUser(admin, userId, {
        title: 'Carnet de Pêche',
        body: preview,
        url: '/home',
      })
    } catch (e) {
      console.error('[cron streak-danger] push best-effort (non bloquant) :', e)
    }
  }
  return true
}

// ─── Helpers dates « jour de Paris » ─────────────────────────────────────────
// Clé de jour (YYYY-MM-DD) en Europe/Paris pour l'idempotence — un run à 07:00 Paris
// doit raisonner sur le jour civil français, pas UTC.

/** Vrai si `d`, lu en Europe/Paris, tombe le jour ISO `isoWeekday` (1=lundi … 7=dimanche). */
function parisIsWeekday(d: Date, isoWeekday: number): boolean {
  // 'en-US' weekday court → on mappe vers l'index ISO via Europe/Paris.
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
  }).format(d)
  const ISO_BY_SHORT: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  }
  return ISO_BY_SHORT[wd] === isoWeekday
}

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
