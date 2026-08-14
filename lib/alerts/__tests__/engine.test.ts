// ─── Tests du moteur d'alertes par port (sprint 72, WS C2) ─────────────────────
// Le moteur est orchestration pure + I/O injectée : on mocke le client admin
// (tables alert_settings / favorite_spots / alerts_sent / catches / notifications,
// RPC current_tier / get_favorite_spot_coords) et on injecte forecast, push, email
// et analytics. La LOGIQUE (décision, overlay, message) tourne en VRAI : ces tests
// vérifient les critères d'acceptation du brief de bout en bout.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runSpotAlerts, type SpotAlertsDeps } from '@/lib/alerts/engine'
import { genericTideSignalForDay } from '@/lib/alerts/big-tide-signal'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'
import type { DailyForecast, FishingWindow } from '@/lib/solunar/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Horloge du run : 2026-07-02 18:00 Paris (16:00 UTC, CEST) → demain = 07-03 ─
const NOW = new Date('2026-07-02T16:00:00Z')
const TOMORROW = '2026-07-03'

// ─── État mutable du mock admin ────────────────────────────────────────────────

type Row = Record<string, unknown>

const state = {
  settings: [] as Row[],
  favorites: [] as Row[],
  spotCoords: [] as Row[],
  alertsSent: [] as Row[],
  bigTideAlertsSent: [] as Row[],
  catchesByUser: {} as Record<string, Row[]>,
  catchesErrorUser: null as string | null,
  tierByUser: {} as Record<string, string>,
  notifInsertError: null as { message: string } | null,
}

const notifInsertSpy = vi.fn()
const alertsSentInsertSpy = vi.fn()
const bigTideSentInsertSpy = vi.fn()

function makeAdmin(): SupabaseClient {
  const fromSpy = vi.fn((table: string) => {
    if (table === 'alert_settings') {
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.eq = vi.fn(() => b)
      // Sprint 77 : l'entrée du batch filtre en `.or(alerts_enabled | big_tide_alert_enabled)`.
      b.or = vi.fn(() => b)
      b.then = (resolve: (v: unknown) => unknown) => resolve({ data: state.settings, error: null })
      return b
    }
    if (table === 'favorite_spots') {
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.in = vi.fn(() => b)
      b.then = (resolve: (v: unknown) => unknown) => resolve({ data: state.favorites, error: null })
      return b
    }
    if (table === 'alerts_sent') {
      let windowDate = ''
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.eq = vi.fn((_col: string, v: string) => {
        windowDate = v
        return b
      })
      b.in = vi.fn(() => b)
      b.insert = vi.fn((payload: Row) => {
        alertsSentInsertSpy(payload)
        const dup = state.alertsSent.some(
          (r) =>
            r.user_id === payload.user_id &&
            r.spot_id === payload.spot_id &&
            r.window_date === payload.window_date,
        )
        if (dup) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
        state.alertsSent.push(payload)
        return Promise.resolve({ error: null })
      })
      b.then = (resolve: (v: unknown) => unknown) =>
        resolve({
          data: state.alertsSent.filter((r) => r.window_date === windowDate),
          error: null,
        })
      return b
    }
    if (table === 'big_tide_alerts_sent') {
      // Journal dédié S77. La lecture filtre `.in('window_date', [aujourd'hui, demain])`
      // puis `.in('user_id', …)` : le mock retient les dates demandées.
      let windowDates: string[] = []
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.in = vi.fn((col: string, v: string[]) => {
        if (col === 'window_date') windowDates = v
        return b
      })
      b.insert = vi.fn((payload: Row) => {
        bigTideSentInsertSpy(payload)
        const dup = state.bigTideAlertsSent.some(
          (r) =>
            r.user_id === payload.user_id &&
            r.spot_id === payload.spot_id &&
            r.window_date === payload.window_date,
        )
        if (dup) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
        state.bigTideAlertsSent.push(payload)
        return Promise.resolve({ error: null })
      })
      b.then = (resolve: (v: unknown) => unknown) =>
        resolve({
          data: state.bigTideAlertsSent.filter((r) =>
            windowDates.includes(r.window_date as string),
          ),
          error: null,
        })
      return b
    }
    if (table === 'catches') {
      let uid = ''
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.eq = vi.fn((_col: string, v: string) => {
        uid = v
        return b
      })
      b.limit = vi.fn(() => b)
      b.then = (resolve: (v: unknown) => unknown) => {
        if (state.catchesErrorUser === uid) {
          return resolve({ data: null, error: { message: 'catches indisponibles' } })
        }
        return resolve({ data: state.catchesByUser[uid] ?? [], error: null })
      }
      return b
    }
    if (table === 'notifications') {
      const b: Record<string, unknown> = {}
      b.insert = vi.fn((payload: Row) => {
        notifInsertSpy(payload)
        return Promise.resolve({ error: state.notifInsertError })
      })
      return b
    }
    throw new Error(`table inattendue : ${table}`)
  })

  const rpcSpy = vi.fn((fn: string, args?: { uid?: string }) => {
    if (fn === 'get_favorite_spot_coords') {
      return Promise.resolve({ data: state.spotCoords, error: null })
    }
    if (fn === 'current_tier') {
      return Promise.resolve({ data: state.tierByUser[args?.uid ?? ''] ?? 'discovery', error: null })
    }
    return Promise.resolve({ data: null, error: { message: `rpc inattendue : ${fn}` } })
  })

  return { from: fromSpy, rpc: rpcSpy } as unknown as SupabaseClient
}

// ─── Fixtures forecast ──────────────────────────────────────────────────────────

// Marée descendante sur la fenêtre 07:00-09:00 Paris (delta -0,6 m >> seuil d'étale).
const FALLING_POINTS = [
  { hour: 5, height_m: 3.0 },
  { hour: 6, height_m: 2.8 },
  { hour: 7, height_m: 2.6 },
  { hour: 8, height_m: 2.3 },
  { hour: 9, height_m: 2.0 },
  { hour: 10, height_m: 1.8 },
]

function makeConditions(
  dateStr: string,
  opts: { extrema?: { type: 'high' | 'low'; hour: number; height_m: number }[] } = {},
): SpotConditions {
  return {
    fetched_at: '2026-07-02T15:00:00Z',
    date: dateStr,
    tide: {
      points: FALLING_POINTS,
      extrema: opts.extrema ?? [
        { type: 'high', hour: 5, height_m: 3.0 },
        { type: 'low', hour: 10, height_m: 1.8 },
      ],
      current_height_m: null,
    },
    weather: {
      wind_speed_kmh: 8,
      wind_speed_by_hour: new Array(24).fill(8),
    },
    waves: {},
    swell: {},
  } as unknown as SpotConditions
}

// Fenêtre du LENDEMAIN : 07:00-09:00 Paris (bucket « le matin »), centre 08:00.
function makeWindow(score: number): FishingWindow {
  return {
    startTimeISO: '2026-07-03T05:00:00Z',
    endTimeISO: '2026-07-03T07:00:00Z',
    centerEvent: { timeISO: '2026-07-03T06:00:00Z' },
    score,
  } as unknown as FishingWindow
}

function makeWeekly(score: number): DailyForecast[] {
  return [
    { date: '2026-07-02', windows: [] },
    { date: TOMORROW, windows: [makeWindow(score)] },
  ] as unknown as DailyForecast[]
}

// ─── Deps injectées ──────────────────────────────────────────────────────────────

// Personnalisation par lat : conditions + score de fenêtre configurables par spot.
let conditionsByLat: Record<string, SpotConditions>
let weeklyScoreByLat: Record<string, number>

const fetchForecastWeekMock = vi.fn(async (lat: number) => [
  makeConditions('2026-07-02'),
  conditionsByLat[String(lat)] ?? makeConditions(TOMORROW),
])
const computeWeeklyMock = vi.fn(async (_start: Date, lat: number) =>
  makeWeekly(weeklyScoreByLat[String(lat)] ?? 80),
)
const sendPushMock = vi.fn(
  async (_admin: unknown, _userId: string, _payload: { title: string; body: string; url: string }) => ({
    sent: 1,
    pruned: 0,
  }),
)
const sendEmailMock = vi.fn(async (_payload: unknown) => true)
const sendBigTideEmailMock = vi.fn(async (_payload: unknown) => true)
const captureMock = vi.fn((_uid: string, _event: string, _props: Record<string, unknown>) => {})

function deps(overrides: Partial<SpotAlertsDeps> = {}): SpotAlertsDeps {
  return {
    now: NOW,
    fetchForecastWeek: fetchForecastWeekMock as unknown as SpotAlertsDeps['fetchForecastWeek'],
    computeWeekly: computeWeeklyMock as unknown as SpotAlertsDeps['computeWeekly'],
    sendPush: sendPushMock as unknown as SpotAlertsDeps['sendPush'],
    sendEmail: sendEmailMock,
    sendBigTideEmail: sendBigTideEmailMock as unknown as SpotAlertsDeps['sendBigTideEmail'],
    capture: captureMock,
    ...overrides,
  }
}

// ─── Fixtures user/spot ──────────────────────────────────────────────────────────

// 4 prises le matin (09:00 Paris), marée descendante, vent 8 km/h → hasEnough +
// tendances « le matin » / « en marée descendante » / « par vent léger ».
const MORNING_CATCH = {
  species: 'bar',
  spot_id: 'spot-A',
  caught_at: '2026-06-15T07:00:00Z',
  wind_speed_kmh: 8,
  tide_state: 'falling',
  conditions: null,
}
const RICH_HISTORY = [MORNING_CATCH, MORNING_CATCH, MORNING_CATCH, MORNING_CATCH]

const SPOT_A = {
  spot_id: 'spot-A',
  name: 'Pointe des Tests',
  slug: 'pointe-des-tests',
  department: '29',
  lng: -4.5,
  lat: 48.1,
}

function settingsRow(uid: string, overrides: Row = {}): Row {
  return {
    user_id: uid,
    alerts_enabled: true,
    channel_push: true,
    channel_email: true,
    alert_threshold: 70,
    big_tide_alert_enabled: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.settings = []
  state.favorites = []
  state.spotCoords = []
  state.alertsSent = []
  state.bigTideAlertsSent = []
  state.catchesByUser = {}
  state.catchesErrorUser = null
  state.tierByUser = {}
  state.notifInsertError = null
  conditionsByLat = {}
  weeklyScoreByLat = {}
  sendPushMock.mockResolvedValue({ sent: 1, pruned: 0 })
  sendEmailMock.mockResolvedValue(true)
  sendBigTideEmailMock.mockResolvedValue(true)
})

function setupRichLocalUser(uid = 'u1') {
  state.settings = [settingsRow(uid)]
  state.favorites = [{ user_id: uid, spot_id: 'spot-A' }]
  state.spotCoords = [SPOT_A]
  state.tierByUser = { [uid]: 'local' }
  state.catchesByUser = { [uid]: RICH_HISTORY }
}

describe('runSpotAlerts — cas nominal perso', () => {
  it('alerte un Local opté-in avec historique : in-app + push + email + journal', async () => {
    setupRichLocalUser()

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(1)
    expect(res.errors).toBe(0)

    // In-app : type spot_alert, ciblé sur le spot, preview <= 140.
    expect(notifInsertSpy).toHaveBeenCalledTimes(1)
    const notif = notifInsertSpy.mock.calls[0][0] as Row
    expect(notif).toMatchObject({ user_id: 'u1', type: 'spot_alert', target_type: 'spot', target_id: 'spot-A' })
    expect(String(notif.preview_text).length).toBeLessThanOrEqual(140)

    // Justification DESCRIPTIVE avec les VRAIS comptes du carnet, sans invention.
    expect(String(notif.preview_text)).toContain('tes 4 prises renseignées tombent le matin')

    // Push : lien fiche spot par SLUG + UTM (jamais de coordonnée).
    expect(sendPushMock).toHaveBeenCalledTimes(1)
    const pushPayload = sendPushMock.mock.calls[0][2] as { title: string; body: string; url: string }
    expect(pushPayload.url).toBe('/spots/pointe-des-tests?utm_source=spot_alert&utm_medium=push')
    expect(pushPayload.title).toContain('Pointe des Tests')

    // Email : contrat WS E, payload complet.
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][0]).toMatchObject({
      userId: 'u1',
      spotId: 'spot-A',
      spotSlug: 'pointe-des-tests',
      windowDate: TOMORROW,
      kind: 'perso',
    })

    // Journal : UNE ligne (user, spot, window_date) écrite après le 1er canal réussi.
    expect(alertsSentInsertSpy).toHaveBeenCalledTimes(1)
    expect(alertsSentInsertSpy.mock.calls[0][0]).toMatchObject({
      user_id: 'u1',
      spot_id: 'spot-A',
      window_date: TOMORROW,
      kind: 'perso',
      score: 80,
    })

    // PostHog : un event par canal servi.
    const channels = captureMock.mock.calls
      .filter((c) => c[1] === 'alert_sent')
      .map((c) => (c[2] as Row).channel)
    expect(channels).toEqual(['inapp', 'push', 'email'])
  })

  it("ne met JAMAIS de coordonnée dans une alerte (nom + slug uniquement)", async () => {
    setupRichLocalUser()

    await runSpotAlerts(makeAdmin(), deps())

    const outbound = JSON.stringify([
      notifInsertSpy.mock.calls,
      sendPushMock.mock.calls.map((c) => c[2]),
      sendEmailMock.mock.calls,
    ])
    // Ni la lat ni la lng du spot (48.1 / -4.5) ne doivent fuiter dans un canal.
    expect(outbound).not.toContain('48.1')
    expect(outbound).not.toContain('-4.5')
  })

  it('dédup : deux runs consécutifs → une seule alerte (journal alerts_sent)', async () => {
    setupRichLocalUser()

    const first = await runSpotAlerts(makeAdmin(), deps())
    const second = await runSpotAlerts(makeAdmin(), deps())

    expect(first.sent).toBe(1)
    expect(second.sent).toBe(0)
    expect(second.deduped).toBe(1)
    expect(notifInsertSpy).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('2 favoris qualifiants → UNE seule alerte, sur le meilleur score', async () => {
    setupRichLocalUser()
    const SPOT_D = { ...SPOT_A, spot_id: 'spot-D', name: 'Cale du Nord', slug: 'cale-du-nord', lat: 48.2 }
    state.favorites = [
      { user_id: 'u1', spot_id: 'spot-A' },
      { user_id: 'u1', spot_id: 'spot-D' },
    ]
    state.spotCoords = [SPOT_A, SPOT_D]
    weeklyScoreByLat = { '48.1': 80, '48.2': 90 }

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(1)
    expect(notifInsertSpy).toHaveBeenCalledTimes(1)
    expect(notifInsertSpy.mock.calls[0][0]).toMatchObject({ target_id: 'spot-D' })
    expect(alertsSentInsertSpy).toHaveBeenCalledTimes(1)
    expect(alertsSentInsertSpy.mock.calls[0][0]).toMatchObject({ spot_id: 'spot-D', score: 90 })
  })
})

describe('runSpotAlerts — gating & honnêteté', () => {
  it('un compte Découverte opté-in ne reçoit RIEN (tier gating)', async () => {
    setupRichLocalUser()
    state.tierByUser = { u1: 'discovery' }

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(0)
    expect(res.skipped).toBe(1)
    expect(notifInsertSpy).not.toHaveBeenCalled()
    expect(sendPushMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('compte pauvre + grande marée Manche → alerte GÉNÉRIQUE explicitement labellisée', async () => {
    state.settings = [settingsRow('u2')]
    const SPOT_M = { spot_id: 'spot-M', name: 'Cap des Vives', slug: 'cap-des-vives', department: '50', lng: -1.5, lat: 49.5 }
    state.favorites = [{ user_id: 'u2', spot_id: 'spot-M' }]
    state.spotCoords = [SPOT_M]
    state.tierByUser = { u2: 'itinerant' }
    state.catchesByUser = { u2: [MORNING_CATCH] } // 1 seule prise → cold start
    // Marnage MESURÉ demain : 9,8 - 0,1 = 9,7 m > seuil Manche (9 m).
    conditionsByLat['49.5'] = makeConditions(TOMORROW, {
      extrema: [
        { type: 'high', hour: 6, height_m: 9.8 },
        { type: 'low', hour: 12, height_m: 0.1 },
      ],
    })

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(1)
    const notif = notifInsertSpy.mock.calls[0][0] as Row
    expect(String(notif.preview_text)).toContain('Alerte générique grande marée (marnage 9,7 m)')
    expect(alertsSentInsertSpy.mock.calls[0][0]).toMatchObject({ kind: 'generique' })
    // Le pourcentage inventé est interdit : aucun « % » dans la copie générique.
    expect(String(notif.preview_text)).not.toContain('%')
  })

  it('compte pauvre SANS grande marée (Atlantique, marnage 4 m) → silence', async () => {
    state.settings = [settingsRow('u2')]
    state.favorites = [{ user_id: 'u2', spot_id: 'spot-A' }]
    state.spotCoords = [SPOT_A] // dept 29 = Atlantique, seuil 5 m
    state.tierByUser = { u2: 'local' }
    state.catchesByUser = { u2: [MORNING_CATCH] }
    conditionsByLat['48.1'] = makeConditions(TOMORROW, {
      extrema: [
        { type: 'high', hour: 6, height_m: 4.5 },
        { type: 'low', hour: 12, height_m: 0.5 },
      ],
    })

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(0)
    expect(res.skipped).toBe(1)
    expect(notifInsertSpy).not.toHaveBeenCalled()
  })

  it('compte pauvre en Méditerranée → JAMAIS de grande marée, silence', async () => {
    state.settings = [settingsRow('u3')]
    const SPOT_MED = { spot_id: 'spot-Med', name: 'Calanque Sud', slug: 'calanque-sud', department: '83', lng: 6.1, lat: 43.1 }
    state.favorites = [{ user_id: 'u3', spot_id: 'spot-Med' }]
    state.spotCoords = [SPOT_MED]
    state.tierByUser = { u3: 'local' }
    state.catchesByUser = { u3: [MORNING_CATCH] }
    // Même un marnage absurde ne doit PAS déclencher en Med (météo-dominé).
    conditionsByLat['43.1'] = makeConditions(TOMORROW, {
      extrema: [
        { type: 'high', hour: 6, height_m: 9.8 },
        { type: 'low', hour: 12, height_m: 0.1 },
      ],
    })

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(0)
    expect(notifInsertSpy).not.toHaveBeenCalled()
  })

  it('compte riche dont la fenêtre ne matche AUCUNE tendance → silence (jamais de copy « perso » sans coïncidence)', async () => {
    // Historique riche mais opposé à la fenêtre de demain (matin, descendante,
    // vent léger) : prises le soir, marée montante, vent fort → overlay.matched = [].
    setupRichLocalUser()
    const eveningCatch = {
      species: 'bar',
      spot_id: 'spot-A',
      caught_at: '2026-06-15T18:30:00Z', // 20:30 Paris → « le soir »
      wind_speed_kmh: 30,
      tide_state: 'rising',
      conditions: null,
    }
    state.catchesByUser = { u1: [eveningCatch, eveningCatch, eveningCatch, eveningCatch] }

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(0)
    expect(res.skipped).toBe(1)
    expect(notifInsertSpy).not.toHaveBeenCalled()
    expect(sendPushMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(alertsSentInsertSpy).not.toHaveBeenCalled()
  })

  it('compte riche sous le seuil utilisateur → silence (pas de fallback générique)', async () => {
    setupRichLocalUser()
    state.settings = [settingsRow('u1', { alert_threshold: 90 })] // fenêtre à 80 < 90

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(0)
    expect(res.skipped).toBe(1)
    expect(notifInsertSpy).not.toHaveBeenCalled()
  })

  it('quiet hours (22h30 Paris) → run court-circuité, zéro requête', async () => {
    setupRichLocalUser()
    const admin = makeAdmin()

    const res = await runSpotAlerts(admin, deps({ now: new Date('2026-07-02T20:30:00Z') }))

    expect(res.quietHours).toBe(true)
    expect(res.sent).toBe(0)
    expect((admin.from as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })
})

describe('runSpotAlerts — canaux & robustesse', () => {
  it("respecte l'opt-out du canal push (in-app + email servis)", async () => {
    setupRichLocalUser()
    state.settings = [settingsRow('u1', { channel_push: false })]

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(1)
    expect(sendPushMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(notifInsertSpy).toHaveBeenCalledTimes(1)
  })

  it("respecte l'opt-out du canal email (in-app + push servis)", async () => {
    setupRichLocalUser()
    state.settings = [settingsRow('u1', { channel_email: false })]

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(1)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(sendPushMock).toHaveBeenCalledTimes(1)
  })

  it('push mort (0 envoyé) → l’email passe quand même', async () => {
    setupRichLocalUser()
    sendPushMock.mockResolvedValue({ sent: 0, pruned: 1 })

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(1)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    // PostHog : pas d'event push (rien reçu), mais inapp + email.
    const channels = captureMock.mock.calls
      .filter((c) => c[1] === 'alert_sent')
      .map((c) => (c[2] as Row).channel)
    expect(channels).toEqual(['inapp', 'email'])
  })

  it('in-app en échec → le journal est écrit après le 1er canal qui réussit (email)', async () => {
    setupRichLocalUser()
    state.notifInsertError = { message: 'insert down' }
    sendPushMock.mockResolvedValue({ sent: 0, pruned: 0 })

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(1) // l'email a servi l'alerte
    expect(alertsSentInsertSpy).toHaveBeenCalledTimes(1)
    expect(state.alertsSent).toHaveLength(1)
  })

  it('TOUS les canaux en échec → PAS de ligne alerts_sent (pas d’alerte fantôme)', async () => {
    setupRichLocalUser()
    state.notifInsertError = { message: 'insert down' }
    sendPushMock.mockResolvedValue({ sent: 0, pruned: 0 })
    sendEmailMock.mockResolvedValue(false)

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(0)
    expect(res.errors).toBe(1)
    expect(alertsSentInsertSpy).not.toHaveBeenCalled()
    expect(state.alertsSent).toHaveLength(0)
  })

  it('une erreur sur un utilisateur ne bloque pas les suivants (fail-soft)', async () => {
    state.settings = [settingsRow('u-err'), settingsRow('u1')]
    state.favorites = [
      { user_id: 'u-err', spot_id: 'spot-A' },
      { user_id: 'u1', spot_id: 'spot-A' },
    ]
    state.spotCoords = [SPOT_A]
    state.tierByUser = { 'u-err': 'local', u1: 'local' }
    state.catchesByUser = { u1: RICH_HISTORY }
    state.catchesErrorUser = 'u-err'

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.errors).toBe(1)
    expect(res.sent).toBe(1)
    expect(notifInsertSpy).toHaveBeenCalledTimes(1)
    expect(notifInsertSpy.mock.calls[0][0]).toMatchObject({ user_id: 'u1' })
  })

  it('sans favori → skip proprement (pas de fetch de prises)', async () => {
    state.settings = [settingsRow('u1')]
    state.favorites = []
    state.spotCoords = []
    state.tierByUser = { u1: 'local' }

    const res = await runSpotAlerts(makeAdmin(), deps())

    expect(res.sent).toBe(0)
    expect(res.skipped).toBe(1)
  })
})

describe('genericTideSignalForDay (signal pur)', () => {
  const bigExtrema = [
    { type: 'high' as const, height_m: 9.8 },
    { type: 'low' as const, height_m: 0.1 },
  ]

  it('Manche (50) : marnage mesuré + seuil 9 m', () => {
    const s = genericTideSignalForDay(bigExtrema, '50')
    expect(s).toMatchObject({ type: 'marnage', thresholdM: 9 })
    expect(s?.type === 'marnage' ? s.rangeM : null).toBeCloseTo(9.7, 6)
  })

  it('Atlantique (29) : seuil 5 m', () => {
    const s = genericTideSignalForDay(bigExtrema, '29')
    expect(s).toMatchObject({ type: 'marnage', thresholdM: 5 })
  })

  it('Méditerranée (83) et Corse (2A) : jamais de signal', () => {
    expect(genericTideSignalForDay(bigExtrema, '83')).toBeNull()
    expect(genericTideSignalForDay(bigExtrema, '2A')).toBeNull()
  })

  it('département char(3) non trimmé : toléré (leçon 103b)', () => {
    expect(genericTideSignalForDay(bigExtrema, '50 ')).toMatchObject({ thresholdM: 9 })
  })

  it('données insuffisantes (pas de BM) : null, jamais de chiffre faux', () => {
    expect(genericTideSignalForDay([{ type: 'high', height_m: 9.8 }], '50')).toBeNull()
  })
})
