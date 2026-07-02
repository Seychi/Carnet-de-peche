// ─── Moteur des alertes par port (sprint 72, WS C2) — orchestration I/O ────────
// Greffé dans le cron du soir (app/api/crons/recfishing-reminders, 17:00 UTC =
// 18h-19h Paris selon la saison) : calcule la veille au soir les fenêtres du
// LENDEMAIN sur les spots FAVORIS des abonnés Local/Itinérant optés-in, et sert
// au plus UNE alerte par utilisateur et par jour (in-app + push web + email).
//
// Toute la LOGIQUE est dans les modules purs de lib/alerts (decision/scoring/
// message/paris, WS C1) : ce fichier ne fait que brancher la donnée réelle
// (Supabase service-role, forecast Open-Meteo caché, push, email) et appliquer
// leurs verdicts. Il ne réinvente AUCUN barème.
//
// INVARIANTS (brief S72, non négociables) :
// - Tier : Local/Itinérant uniquement (RPC current_tier, 1 appel/user max).
// - JAMAIS de coordonnée dans une alerte : nom + slug du spot uniquement. Les
//   coords précises (RPC service-role get_favorite_spot_coords) ne servent QUE
//   la prévision, elles ne sortent dans aucun canal.
// - Dédup : journal alerts_sent (user, spot, window_date), écrit APRÈS le 1er
//   canal réussi (pas d'alerte fantôme si tous les envois échouent).
// - Quiet hours 21h-7h Europe/Paris ; fenêtres du LENDEMAIN (jour civil Paris).
// - FAIL-SOFT par utilisateur : une erreur n'arrête jamais le batch.
// - Honnêteté : cold start = alerte générique grande marée (marnage MESURÉ),
//   explicitement labellisée. Jamais de pourcentage inventé.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeWeeklyForecast } from '@/lib/solunar'
import { getParisHour } from '@/lib/solunar/format'
import type { DailyForecast, FishingWindow } from '@/lib/solunar/types'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'
import { toCatchSamples, type DbCatchRow } from '@/lib/scoring/personal/buckets'
import { computePersonalTendencies } from '@/lib/scoring/personal/tendencies'
import type { CatchSample } from '@/lib/scoring/personal/types'
import { sendPushToUser, type PushPayload, type SendPushResult } from '@/lib/push/send'
import { genericTideSignalForDay } from './big-tide-signal'
import {
  DEFAULT_ALERT_THRESHOLD,
  isQuietHoursParis,
  pickBestAlertCandidate,
  shouldSendAlert,
  tomorrowParisDateKey,
} from './decision'
import { buildAlertMessage, buildJustification } from './message'
import { buildWindowLabel } from './paris'
import { computeWindowOverlay, tideDirectionForWindow } from './scoring'
import type {
  AlertChannels,
  AlertSettings,
  GenericTideSignal,
  SpotAlertPayload,
  WindowFacts,
} from './types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SpotAlertsRunResult = {
  /** true = run court-circuité (21h-7h Paris) : rien tenté. */
  quietHours: boolean
  /** Lignes alert_settings avec alerts_enabled = true (l'entrée du batch). */
  optedIn: number
  /** Utilisateurs ayant reçu une alerte (>= 1 canal servi). */
  sent: number
  /** Utilisateurs sautés car déjà alertés pour la fenêtre de demain (journal). */
  deduped: number
  /** Utilisateurs sans envoi (tier, pas de favori, pas de candidat qualifiant). */
  skipped: number
  /** Utilisateurs NON traités : budget temps du cron épuisé (servis au run suivant). */
  truncated: number
  /** Utilisateurs en échec (fail-soft : loggé, le batch continue). */
  errors: number
}

/**
 * Budget temps du greffon (revue S72) : la route hôte a maxDuration = 60 s, partagés
 * avec les greffons RecFishing et co-pêchage qui passent AVANT. On s'arrête proprement
 * à 40 s : les users restants partent en `truncated` et seront servis au run suivant.
 */
export const SPOT_ALERTS_TIME_BUDGET_MS = 40_000

/**
 * Dépendances injectables (tests) — les défauts branchent la vraie chaîne.
 * `fetchForecastWeek` et l'email sont importés DYNAMIQUEMENT dans les défauts :
 * lib/conditions/spot-forecast tire le client service-role (pattern big-tide S49)
 * et lib/email/spot-alert tire `server-only` via lib/email/send (WS E).
 */
export type SpotAlertsDeps = {
  now?: Date
  fetchForecastWeek?: (lat: number, lng: number) => Promise<SpotConditions[]>
  computeWeekly?: (
    start: Date,
    lat: number,
    lng: number,
    week: SpotConditions[],
  ) => Promise<DailyForecast[]>
  sendPush?: (admin: SupabaseClient, userId: string, payload: PushPayload) => Promise<SendPushResult>
  /** Contrat WS E : true = envoyé. Résout le destinataire + opt-out email global S26. */
  sendEmail?: (payload: SpotAlertPayload) => Promise<boolean>
  capture?: (userId: string, event: string, props: Record<string, unknown>) => void | Promise<void>
}

type AlertSettingsRow = {
  user_id: string
  alerts_enabled: boolean
  channel_push: boolean | null
  channel_email: boolean | null
  alert_threshold: number | null
}

type FavoriteSpotCoords = {
  spot_id: string
  name: string
  slug: string
  department: string | null
  lng: number
  lat: number
}

/** Contexte pré-calculé d'un spot pour la fenêtre de demain (partagé entre users). */
type SpotDayContext = {
  spot: FavoriteSpotCoords
  window: FishingWindow
  conditions: SpotConditions
}

type AlertCandidate = {
  /** score/kind au top-level : contrat de pickBestAlertCandidate (perso > générique, puis score). */
  score: number
  kind: 'perso' | 'generique'
  payload: SpotAlertPayload
  channels: AlertChannels
}

// ─── Dépendances par défaut ─────────────────────────────────────────────────────

async function defaultFetchForecastWeek(lat: number, lng: number): Promise<SpotConditions[]> {
  // Import dynamique (modèle big-tide S49) : spot-forecast tire le client
  // service-role → un import statique casserait l'évaluation hors runtime serveur.
  const { fetchSpotForecastWeek } = await import('@/lib/conditions/spot-forecast')
  return fetchSpotForecastWeek(lat, lng)
}

async function defaultSendEmail(payload: SpotAlertPayload): Promise<boolean> {
  try {
    // Module du WS E (contrat S72) : ne throw jamais, résout le destinataire et
    // respecte l'opt-out email global S26 EN PLUS du canal. Import dynamique
    // (modèle cron dunning-relances) : il tire `server-only` via lib/email/send.
    const mod = (await import('@/lib/email/spot-alert')) as {
      sendSpotAlertEmail: (p: SpotAlertPayload) => Promise<boolean>
    }
    return await mod.sendSpotAlertEmail(payload)
  } catch (e) {
    console.error('[spot-alerts] module email indisponible (non bloquant) :', e)
    return false
  }
}

async function defaultCapture(
  userId: string,
  event: string,
  props: Record<string, unknown>,
): Promise<void> {
  try {
    // lib/analytics-server (posthog-node) : no-op sans clé ; `flush()` est appelé
    // UNE fois par la route hôte après le run (pattern serverless).
    const { captureServer } = await import('@/lib/analytics-server')
    captureServer(userId, event, props)
  } catch {
    // L'instrumentation ne casse jamais le batch.
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Vent (km/h) à l'heure CENTRALE de la fenêtre — même échantillonnage que buildWindow (S19). */
function windAtWindowCenter(window: FishingWindow, conditions: SpotConditions): number | null {
  const centerHour = getParisHour(new Date(window.centerEvent.timeISO))
  const byHour = conditions.weather.wind_speed_by_hour
  if (byHour && centerHour >= 0 && centerHour < byHour.length && byHour[centerHour] != null) {
    return byHour[centerHour]
  }
  return conditions.weather.wind_speed_kmh
}

/** Meilleure fenêtre (score max) du jour, ou null si aucune. */
function bestWindowOf(daily: DailyForecast | undefined): FishingWindow | null {
  if (!daily || daily.windows.length === 0) return null
  return daily.windows.reduce((a, b) => (b.score > a.score ? b : a))
}

// ─── Le run ─────────────────────────────────────────────────────────────────────

export async function runSpotAlerts(
  admin: SupabaseClient,
  deps: SpotAlertsDeps = {},
): Promise<SpotAlertsRunResult> {
  const now = deps.now ?? new Date()
  const result: SpotAlertsRunResult = {
    quietHours: false,
    optedIn: 0,
    sent: 0,
    deduped: 0,
    skipped: 0,
    truncated: 0,
    errors: 0,
  }

  // Garde-fou global : jamais d'envoi 21h-7h Europe/Paris. Le cron hôte tourne à
  // 17:00 UTC (18h-19h Paris) → passe toujours ; ce court-circuit protège un
  // déclenchement manuel nocturne sans dépenser une seule requête.
  if (isQuietHoursParis(now)) {
    result.quietHours = true
    return result
  }

  const fetchForecastWeek = deps.fetchForecastWeek ?? defaultFetchForecastWeek
  const computeWeekly = deps.computeWeekly ?? computeWeeklyForecast
  const sendPush = deps.sendPush ?? sendPushToUser
  const sendEmail = deps.sendEmail ?? defaultSendEmail
  const capture = deps.capture ?? defaultCapture

  const tomorrowKey = tomorrowParisDateKey(now)

  // 1. Entrée du batch : SEULS les optés-in (défaut OFF, RGPD) — filtre SQL, pas mémoire.
  const { data: settingsData, error: settingsErr } = await admin
    .from('alert_settings')
    .select('user_id, alerts_enabled, channel_push, channel_email, alert_threshold')
    .eq('alerts_enabled', true)
  if (settingsErr) throw settingsErr
  const settingsRows = (settingsData ?? []) as AlertSettingsRow[]
  result.optedIn = settingsRows.length
  if (settingsRows.length === 0) return result

  const userIds = settingsRows.map((r) => r.user_id)

  // 2. Favoris de TOUS les utilisateurs éligibles en UNE requête (pas de N+1).
  const { data: favData, error: favErr } = await admin
    .from('favorite_spots')
    .select('user_id, spot_id')
    .in('user_id', userIds)
  if (favErr) throw favErr
  const favoritesByUser = new Map<string, string[]>()
  for (const row of (favData ?? []) as { user_id: string; spot_id: string }[]) {
    const list = favoritesByUser.get(row.user_id) ?? []
    list.push(row.spot_id)
    favoritesByUser.set(row.user_id, list)
  }

  // 3. Coords PRÉCISES des spots favorisés (RPC service-role, migration 106) en UN
  //    appel pour tout le batch. department déjà trimmé à la source (char(3), 103b).
  const { data: coordsData, error: coordsErr } = await admin.rpc('get_favorite_spot_coords')
  if (coordsErr) throw coordsErr
  const spotById = new Map<string, FavoriteSpotCoords>()
  for (const row of (coordsData ?? []) as FavoriteSpotCoords[]) {
    spotById.set(row.spot_id, row)
  }

  // 4. Journal de dédup pour DEMAIN en une requête : un user déjà servi pour cette
  //    fenêtre (n'importe quel spot) ne reçoit RIEN (max 1 alerte/user/jour, re-runs
  //    compris) ; la paire (user, spot) alimente aussi le check par candidat.
  const { data: sentData, error: sentErr } = await admin
    .from('alerts_sent')
    .select('user_id, spot_id')
    .eq('window_date', tomorrowKey)
    .in('user_id', userIds)
  if (sentErr) throw sentErr
  const alreadyServedUsers = new Set<string>()
  const alreadyServedPairs = new Set<string>()
  for (const row of (sentData ?? []) as { user_id: string; spot_id: string }[]) {
    alreadyServedUsers.add(row.user_id)
    alreadyServedPairs.add(`${row.user_id}:${row.spot_id}`)
  }

  // Contexte par spot (forecast + meilleure fenêtre de demain), mémoïsé pour le run :
  // deux users qui suivent le même spot ne déclenchent qu'UN pipeline (fetch déjà
  // caché 1h côté weather_cache/unstable_cache, on évite en plus le recalcul solunar).
  const spotContextCache = new Map<string, Promise<SpotDayContext | null>>()
  const getSpotContext = (spot: FavoriteSpotCoords): Promise<SpotDayContext | null> => {
    let cached = spotContextCache.get(spot.spot_id)
    if (!cached) {
      cached = (async () => {
        try {
          const week = await fetchForecastWeek(spot.lat, spot.lng)
          const conditions = week.find((d) => d.date === tomorrowKey)
          if (!conditions) return null
          const weekly = await computeWeekly(now, spot.lat, spot.lng, week)
          const window = bestWindowOf(weekly.find((d) => d.date === tomorrowKey))
          if (!window) return null
          return { spot, window, conditions }
        } catch (e) {
          console.error(`[spot-alerts] forecast spot ${spot.spot_id} échec (non bloquant) :`, e)
          return null
        }
      })()
      spotContextCache.set(spot.spot_id, cached)
    }
    return cached
  }

  // 5. Boucle par utilisateur — FAIL-SOFT strict : une erreur = log + user suivant.
  // Garde-temps (revue S72) : le cron hôte partage maxDuration=60 s avec les greffons
  // RecFishing/co-pêchage. Au-delà du budget, arrêt PROPRE : les users restants sont
  // comptés (truncated) et seront servis au run suivant (le journal alerts_sent rend
  // le re-run idempotent) — mieux qu'une coupure Vercel silencieuse en plein envoi.
  const startedAtMs = Date.now()
  for (const [userIndex, row] of settingsRows.entries()) {
    if (Date.now() - startedAtMs > SPOT_ALERTS_TIME_BUDGET_MS) {
      result.truncated = settingsRows.length - userIndex
      console.error('[spot-alerts] budget temps épuisé, run tronqué', {
        budgetMs: SPOT_ALERTS_TIME_BUDGET_MS,
        truncated: result.truncated,
      })
      break
    }
    const uid = row.user_id
    try {
      // Max 1 alerte / user / jour : le journal fait foi, re-runs compris.
      if (alreadyServedUsers.has(uid)) {
        result.deduped++
        continue
      }

      const favoriteIds = (favoritesByUser.get(uid) ?? []).filter((id) => spotById.has(id))
      if (favoriteIds.length === 0) {
        result.skipped++
        continue
      }

      // Tier : 1 appel current_tier par user, jamais plus (pas de N+1). Pré-check
      // avant tout fetch lourd ; la décision pure re-vérifie (défense en profondeur).
      const { data: tier, error: tierErr } = await admin.rpc('current_tier', { uid })
      if (tierErr) throw tierErr
      if (tier !== 'local' && tier !== 'itinerant') {
        result.skipped++
        continue
      }

      const settings: AlertSettings = {
        alertsEnabled: row.alerts_enabled === true,
        channelPush: row.channel_push !== false,
        channelEmail: row.channel_email !== false,
        threshold:
          typeof row.alert_threshold === 'number' ? row.alert_threshold : DEFAULT_ALERT_THRESHOLD,
      }

      // Prises de l'utilisateur (service-role, colonnes du moteur perso S22) — UNE
      // requête par user, réutilisée pour tous ses favoris.
      const { data: catchRows, error: catchErr } = await admin
        .from('catches')
        .select('species, spot_id, caught_at, wind_speed_kmh, tide_state, conditions')
        .eq('user_id', uid)
        .limit(2000)
      if (catchErr) throw catchErr
      const samples: CatchSample[] = toCatchSamples((catchRows ?? []) as DbCatchRow[])

      // Tendances GLOBALES calculées une fois ; le scope spot est tenté par favori.
      const globalTendencies = computePersonalTendencies(samples)

      const candidates: AlertCandidate[] = []
      for (const spotId of favoriteIds) {
        const spot = spotById.get(spotId)
        if (!spot) continue
        const ctx = await getSpotContext(spot)
        if (!ctx) continue

        // Scope perso : les tendances AU SPOT si l'historique y suffit (>= 3 prises,
        // seuil S22), sinon fallback sur le global (décision documentée : au spot,
        // l'échantillon est souvent < 3 → le global reste honnête, il décrit TES prises).
        const spotScoped = computePersonalTendencies(samples, { spotId })
        const tendencies = spotScoped.hasEnough ? spotScoped : globalTendencies

        const tideDirection = tideDirectionForWindow(
          ctx.window.startTimeISO,
          ctx.window.endTimeISO,
          ctx.conditions.tide.points,
        )
        const windSpeedKmh = windAtWindowCenter(ctx.window, ctx.conditions)

        const overlay = computeWindowOverlay(
          {
            startTimeISO: ctx.window.startTimeISO,
            endTimeISO: ctx.window.endTimeISO,
            score: ctx.window.score,
            tideDirection,
            windSpeedKmh,
          },
          tendencies,
        )

        // Signal grande marée du LENDEMAIN : cold start uniquement (un compte riche
        // sous seuil = silence, jamais de fallback générique — contrat decision.ts).
        const genericSignal: GenericTideSignal | null = !tendencies.hasEnough
          ? genericTideSignalForDay(ctx.conditions.tide.extrema, spot.department)
          : null

        const decision = shouldSendAlert({
          tier,
          settings,
          trends: overlay.trends,
          windowScore: overlay.score,
          windowDate: tomorrowKey,
          sendAt: now,
          alreadySent: alreadyServedPairs.has(`${uid}:${spotId}`),
          genericTideSignal: genericSignal,
        })
        if (!decision.send) continue

        // Honnêteté (revue S72) : « perso » exige au moins une tendance coïncidente
        // (overlay.kind applique MIN_MATCHED_FACTORS). Un compte riche dont la fenêtre
        // ne matche AUCUN de ses patterns = silence sur ce spot : jamais de copy
        // « tes conditions » sans coïncidence, et jamais de retombée générique
        // (contrat decision.ts : un compte riche ne redevient pas générique).
        if (decision.kind === 'perso' && overlay.kind !== 'perso') continue

        // Faits MESURÉS cités dans la justification — jamais de chiffre inventé.
        const facts: WindowFacts =
          decision.kind === 'generique'
            ? genericSignal?.type === 'coefficient'
              ? { tideCoefficient: genericSignal.coefficient }
              : { tideRangeM: genericSignal?.rangeM ?? null }
            : { tideDirection, windSpeedKmh }

        const justification = buildJustification({
          kind: decision.kind,
          facts,
          matched: overlay.matched,
        })

        const payload: SpotAlertPayload = {
          userId: uid,
          spotId,
          spotName: spot.name,
          spotSlug: spot.slug,
          windowDate: tomorrowKey,
          windowLabel: buildWindowLabel(ctx.window.startTimeISO),
          score: overlay.score,
          kind: decision.kind,
          justification,
        }
        candidates.push({
          score: payload.score,
          kind: payload.kind,
          payload,
          channels: decision.channels,
        })
      }

      // Budget « 1 alerte / user / jour » : UN seul candidat servi (perso avant
      // générique, puis meilleur score — contrat pickBestAlertCandidate).
      const chosen = pickBestAlertCandidate(candidates)
      if (!chosen) {
        result.skipped++
        continue
      }

      const served = await deliverAlert(admin, chosen, {
        sendPush,
        sendEmail,
        capture,
        tomorrowKey,
      })
      if (served) result.sent++
      else result.errors++
    } catch (e) {
      console.error(`[spot-alerts] user ${uid} échec (fail-soft, batch continue) :`, e)
      result.errors++
    }
  }

  console.log('[spot-alerts] run terminé', {
    windowDate: tomorrowKey,
    ...result,
  })
  return result
}

// ─── Livraison d'une alerte (in-app → push → email) ────────────────────────────
// Journal alerts_sent écrit APRÈS le 1er canal réussi (pas d'alerte fantôme) :
// si TOUS les canaux échouent, aucune ligne → le run suivant retentera. Un doublon
// 23505 (course entre deux runs) est traité comme déjà journalisé.

async function deliverAlert(
  admin: SupabaseClient,
  chosen: AlertCandidate,
  io: {
    sendPush: NonNullable<SpotAlertsDeps['sendPush']>
    sendEmail: NonNullable<SpotAlertsDeps['sendEmail']>
    capture: NonNullable<SpotAlertsDeps['capture']>
    tomorrowKey: string
  },
): Promise<boolean> {
  const { payload, channels } = chosen
  const msg = buildAlertMessage(payload)

  let recorded = false
  const record = async (): Promise<boolean> => {
    const { error } = await admin.from('alerts_sent').insert({
      user_id: payload.userId,
      spot_id: payload.spotId,
      window_date: payload.windowDate,
      score: payload.score,
      kind: payload.kind,
    })
    if (!error) return true
    if ((error as { code?: string }).code === '23505') return true // déjà journalisée (course)
    console.error('[spot-alerts] journal alerts_sent échec :', error.message)
    return false
  }

  const captureSent = async (channel: 'inapp' | 'push' | 'email') => {
    // Zéro PII / zéro coordonnée : uuid du spot + score + jour, rien d'autre.
    await io.capture(payload.userId, 'alert_sent', {
      kind: payload.kind,
      channel,
      spot_id: payload.spotId,
      score: payload.score,
      window_date: payload.windowDate,
    })
  }

  let anySuccess = false

  // Canal 1 : in-app (canal de base, non désactivable v1). INSERT service-role
  // (pattern actor_id NULL S63 : notif système, pas d'acteur humain).
  try {
    const { error: notifErr } = await admin.from('notifications').insert({
      user_id: payload.userId,
      type: 'spot_alert',
      target_type: 'spot',
      target_id: payload.spotId,
      preview_text: msg.body.slice(0, 140),
    })
    if (notifErr) {
      console.error('[spot-alerts] insert notif échec (non bloquant) :', notifErr.message)
    } else {
      anySuccess = true
      recorded = await record()
      await captureSent('inapp')
    }
  } catch (e) {
    console.error('[spot-alerts] insert notif exception (non bloquant) :', e)
  }

  // Canal 2 : push web (si canal actif). sendPushToUser ne throw jamais, no-op sans
  // clés VAPID, purge les abonnements morts (404/410) → un push mort n'empêche pas
  // l'email de passer.
  if (channels.push) {
    try {
      const pushRes = await io.sendPush(admin, payload.userId, {
        title: msg.title,
        body: msg.body,
        // UTM aligné sur l'email (WS E) : utm_source=spot_alert partout, seul le
        // medium change → alert_clicked mesurable par canal via les $pageview.
        url: `/spots/${payload.spotSlug}?utm_source=spot_alert&utm_medium=push`,
      })
      if (pushRes.sent > 0) {
        anySuccess = true
        if (!recorded) recorded = await record()
        await captureSent('push')
      }
    } catch (e) {
      console.error('[spot-alerts] push best-effort (non bloquant) :', e)
    }
  }

  // Canal 3 : email (si canal actif). Le module WS E résout le destinataire et
  // respecte l'opt-out email global S26 EN PLUS du canal ; il ne throw jamais.
  if (channels.email) {
    try {
      const emailed = await io.sendEmail(payload)
      if (emailed) {
        anySuccess = true
        if (!recorded) recorded = await record()
        await captureSent('email')
      }
    } catch (e) {
      console.error('[spot-alerts] email best-effort (non bloquant) :', e)
    }
  }

  if (anySuccess && !recorded) {
    // Alerte servie mais journal en échec : le run suivant pourrait re-servir.
    // Loggé fort pour investigation, mais on ne défait pas un envoi déjà parti.
    console.error(
      `[spot-alerts] ⚠️ alerte servie SANS journal (user ${payload.userId}, spot ${payload.spotId})`,
    )
  }

  return anySuccess
}
