// ─── Tests du cron recfishing-reminders ÉTENDU (sprint 72, WS C2) ──────────────
// Le bloc « alertes par port » est greffé dans ce cron (17:00 UTC = 18h-19h Paris,
// le créneau « veille au soir » des fenêtres du LENDEMAIN — décision ancrage : pas
// de 5e cron). Ces tests vérifient le GREFFON : auth fail-closed, compteurs dans la
// réponse, best-effort strict (un échec du bloc alertes ne casse jamais le cron),
// flush PostHog. La logique du moteur est couverte par lib/alerts/__tests__/engine.
//
// Modèle de mock : app/api/crons/personal-window/__tests__/route.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock admin : blocs recfishing + co-pêchage neutres (aucune donnée) ─────────
const { adminMock } = vi.hoisted(() => {
  // Builder générique chaînable et thenable : toutes les méthodes de requête
  // renvoient le builder, l'await résout data vide (aucun candidat recfishing,
  // aucune sortie à rappeler → les blocs existants sont no-op, on teste le greffon).
  function emptyBuilder() {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'update', 'insert', 'eq', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'limit']) {
      b[m] = vi.fn(() => b)
    }
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null })
    return b
  }
  const adminMock = {
    from: vi.fn(() => emptyBuilder()),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
  }
  return { adminMock }
})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminMock }))

// ── Mock du moteur d'alertes (couvert par ses propres tests) ───────────────────
const { runSpotAlertsMock } = vi.hoisted(() => ({ runSpotAlertsMock: vi.fn() }))
vi.mock('@/lib/alerts/engine', () => ({ runSpotAlerts: runSpotAlertsMock }))

// ── Mock analytics serveur (le vrai module tire `server-only`) ─────────────────
const { flushMock } = vi.hoisted(() => ({ flushMock: vi.fn() }))
vi.mock('@/lib/analytics-server', () => ({
  flush: flushMock,
  captureServer: vi.fn(),
}))

import { GET } from '@/app/api/crons/recfishing-reminders/route'

function makeRequest(secret = 'test-secret') {
  return {
    headers: { get: (k: string) => (k === 'authorization' ? `Bearer ${secret}` : null) },
  } as unknown as Parameters<typeof GET>[0]
}

const RUN_RESULT = {
  quietHours: false,
  optedIn: 3,
  sent: 1,
  deduped: 1,
  skipped: 1,
  errors: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  runSpotAlertsMock.mockResolvedValue(RUN_RESULT)
  flushMock.mockResolvedValue(undefined)
})

describe('cron recfishing-reminders — sécurité', () => {
  it('rejette une requête sans le bon Bearer (fail-closed 401), sans lancer le moteur', async () => {
    const req = {
      headers: { get: () => 'Bearer mauvais' },
    } as unknown as Parameters<typeof GET>[0]
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(runSpotAlertsMock).not.toHaveBeenCalled()
  })
})

describe('cron recfishing-reminders — greffon alertes par port', () => {
  it('lance runSpotAlerts avec le client admin et reporte ses compteurs', async () => {
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(runSpotAlertsMock).toHaveBeenCalledTimes(1)
    expect(runSpotAlertsMock).toHaveBeenCalledWith(adminMock)
    expect(body.spotAlerts).toEqual(RUN_RESULT)
    // Les compteurs des blocs existants restent présents (anti-régression).
    expect(body).toMatchObject({ reminded: 0, outingsReminded: 0, outingsDone: 0 })
  })

  it('flush PostHog UNE fois après le run (rafale alert_sent en serverless)', async () => {
    await GET(makeRequest())
    expect(flushMock).toHaveBeenCalledTimes(1)
  })

  it('un échec du bloc alertes ne casse JAMAIS le cron (best-effort strict)', async () => {
    runSpotAlertsMock.mockRejectedValue(new Error('moteur en panne'))

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    // Compteurs à zéro par défaut (aucune alerte revendiquée à tort).
    expect(body.spotAlerts).toEqual({
      quietHours: false,
      optedIn: 0,
      sent: 0,
      deduped: 0,
      skipped: 0,
      errors: 0,
    })
  })

  it('un échec du flush analytics est silencieux (instrumentation jamais bloquante)', async () => {
    flushMock.mockRejectedValue(new Error('posthog down'))

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.spotAlerts.sent).toBe(1)
  })
})
