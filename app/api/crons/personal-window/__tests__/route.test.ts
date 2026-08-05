import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks du client admin ──────────────────────────────────────────────────────
// On distingue les tables par l'argument de from(). Builders thenables :
//  - profiles : SELECT → liste de profils (data)
//  - catches  : SELECT → prises d'un user (data) ; on route par le dernier eq(user_id)
//  - notifications : SELECT head/count (dédup) → count ; INSERT → enregistré (insertSpy)
// rpc('current_tier') → tier par user.
const { adminMock, insertSpy, setProfiles, setTierByUser, setCatchesByUser, setDupCount } =
  vi.hoisted(() => {
    let profiles: unknown[] = []
    let tierByUser: Record<string, string> = {}
    let catchesByUser: Record<string, unknown[]> = {}
    let dupCount = 0
    const insertSpy = vi.fn()

    function profilesBuilder() {
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.not = vi.fn(() => b)
      b.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
        resolve({ data: profiles, error: null })
      return b
    }

    function catchesBuilder() {
      let uid = ''
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => b)
      b.eq = vi.fn((_col: string, v: string) => {
        uid = v
        return b
      })
      b.limit = vi.fn(() => b)
      b.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
        resolve({ data: catchesByUser[uid] ?? [], error: null })
      return b
    }

    function notificationsBuilder() {
      let mode: 'count' | 'insert' = 'count'
      const b: Record<string, unknown> = {}
      b.select = vi.fn(() => {
        mode = 'count'
        return b
      })
      b.insert = vi.fn((payload: unknown) => {
        mode = 'insert'
        insertSpy(payload)
        return Promise.resolve({ error: null })
      })
      for (const m of ['eq', 'gte', 'lt']) {
        b[m] = vi.fn(() => b)
      }
      b.then = (resolve: (v: { count: number; error: null }) => unknown) => {
        if (mode === 'count') return resolve({ count: dupCount, error: null })
        return resolve({ count: 0, error: null })
      }
      return b
    }

    const adminMock = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profilesBuilder()
        if (table === 'catches') return catchesBuilder()
        if (table === 'notifications') return notificationsBuilder()
        throw new Error(`table inattendue: ${table}`)
      }),
      rpc: vi.fn((_fn: string, args: { uid: string }) =>
        Promise.resolve({ data: tierByUser[args.uid] ?? 'discovery', error: null }),
      ),
    }

    return {
      adminMock,
      insertSpy,
      setProfiles: (p: unknown[]) => {
        profiles = p
      },
      setTierByUser: (t: Record<string, string>) => {
        tierByUser = t
      },
      setCatchesByUser: (c: Record<string, unknown[]>) => {
        catchesByUser = c
      },
      setDupCount: (n: number) => {
        dupCount = n
      },
    }
  })

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminMock }))

const { getDeptNextWindowMock, getDeptUpcomingWindowsMock } = vi.hoisted(() => ({
  getDeptNextWindowMock: vi.fn(),
  getDeptUpcomingWindowsMock: vi.fn(),
}))
vi.mock('@/lib/conditions/dept-window', () => ({
  getDeptNextWindow: getDeptNextWindowMock,
  // Greffon digest (sprint 49) : neutre par défaut (aucune fenêtre à venir).
  getDeptUpcomingWindows: getDeptUpcomingWindowsMock,
}))

// Greffons sprint 49 (push & engagement) : on isole leur logique métier de ce test
// (couverte par leurs propres tests unitaires). big-tide neutralisé (pas de grande
// marée par défaut) → n'ajoute aucun insert ni log server-only ; la fermeture d'espèce
// est déjà inerte ici (profils de test sans favorite_species).
const { getBigTideForDayMock } = vi.hoisted(() => ({ getBigTideForDayMock: vi.fn() }))
vi.mock('@/lib/notifications/big-tide', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications/big-tide')>()
  return { ...actual, getBigTideForDay: getBigTideForDayMock }
})

// Récap hebdo : on neutralise la COMPOSITION (renvoie null = rien à dire) pour que ce
// test reste déterministe quel que soit le jour de la semaine où il tourne. Le contenu
// du digest est couvert par les tests unitaires de composeWeeklyDigest.
const { composeWeeklyDigestMock } = vi.hoisted(() => ({ composeWeeklyDigestMock: vi.fn() }))
vi.mock('@/lib/notifications/weekly-digest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications/weekly-digest')>()
  return { ...actual, composeWeeklyDigest: composeWeeklyDigestMock }
})

// Greffon lifecycle (sprint 74) : sa logique a ses propres tests unitaires
// (lib/lifecycle/__tests__/cron.test.ts). On le neutralise ici pour deux raisons :
// garder ce test focalisé sur la notif perso, et ne pas charger `server-only` via
// la chaîne d'import des templates email.
const { runLifecycleGreffonMock } = vi.hoisted(() => ({ runLifecycleGreffonMock: vi.fn() }))
vi.mock('@/lib/lifecycle/cron', () => ({ runLifecycleGreffon: runLifecycleGreffonMock }))

import { GET } from '@/app/api/crons/personal-window/route'

function makeRequest(secret = 'test-secret') {
  return {
    headers: { get: (k: string) => (k === 'authorization' ? `Bearer ${secret}` : null) },
  } as unknown as Parameters<typeof GET>[0]
}

// 4 prises du matin (09:00 Paris) en marée descendante → hasEnough + tendance « le matin ».
const MORNING_CATCH = {
  species: 'bar',
  spot_id: 'spot-A',
  caught_at: '2026-06-15T07:00:00Z',
  wind_speed_kmh: 8,
  tide_state: 'falling',
  conditions: null,
}
const fourMorningCatches = [MORNING_CATCH, MORNING_CATCH, MORNING_CATCH, MORNING_CATCH]

// Créneau du jour MATIN (09:00 Paris), bon score → matche la tendance.
const morningWindow = {
  startTimeISO: '2026-06-15T07:00:00Z',
  endTimeISO: '2026-06-15T09:00:00Z',
  score: 78,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  setProfiles([])
  setTierByUser({})
  setCatchesByUser({})
  setDupCount(0)
  getDeptNextWindowMock.mockResolvedValue(morningWindow)
  // Greffons sprint 49 neutres par défaut : pas de grande marée, pas de fenêtre à venir.
  getBigTideForDayMock.mockResolvedValue(null)
  getDeptUpcomingWindowsMock.mockResolvedValue([])
  composeWeeklyDigestMock.mockReturnValue(null)
  runLifecycleGreffonMock.mockResolvedValue({
    j1: 0,
    j3: 0,
    weekly: 0,
    failed: 0,
    timedOut: false,
  })
})

describe('cron personal-window — sécurité', () => {
  it('rejette une requête sans le bon Bearer (fail-closed 401)', async () => {
    const req = {
      headers: { get: () => 'Bearer mauvais' },
    } as unknown as Parameters<typeof GET>[0]
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

describe('cron personal-window — logique de notif', () => {
  it('notifie un abonné Local dont les conditions reviennent', async () => {
    setProfiles([{ id: 'u-local', home_department: '29' }])
    setTierByUser({ 'u-local': 'local' })
    setCatchesByUser({ 'u-local': fourMorningCatches })

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.notified).toBe(1)
    expect(insertSpy).toHaveBeenCalledTimes(1)
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u-local', type: 'optimal_window' }),
    )
  })

  it('ne notifie JAMAIS un compte Découverte (gratuit), même si ses conditions matchent', async () => {
    setProfiles([{ id: 'u-free', home_department: '29' }])
    setTierByUser({ 'u-free': 'discovery' })
    setCatchesByUser({ 'u-free': fourMorningCatches })

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.notified).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('ne notifie pas si le créneau du jour ne matche pas la tendance', async () => {
    setProfiles([{ id: 'u-local', home_department: '29' }])
    setTierByUser({ 'u-local': 'local' })
    setCatchesByUser({ 'u-local': fourMorningCatches })
    // Créneau du soir (21:00 Paris) ≠ tendance « le matin ».
    getDeptNextWindowMock.mockResolvedValue({
      startTimeISO: '2026-06-15T19:00:00Z',
      endTimeISO: '2026-06-15T21:00:00Z',
      score: 90,
    })

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.notified).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('idempotence : ne renvoie pas si une notif optimal_window existe déjà aujourd’hui', async () => {
    setProfiles([{ id: 'u-local', home_department: '29' }])
    setTierByUser({ 'u-local': 'local' })
    setCatchesByUser({ 'u-local': fourMorningCatches })
    setDupCount(1) // déjà notifié aujourd'hui

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.notified).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('ne notifie pas un abonné avec trop peu de prises (hasEnough = false)', async () => {
    setProfiles([{ id: 'u-local', home_department: '29' }])
    setTierByUser({ 'u-local': 'local' })
    setCatchesByUser({ 'u-local': [MORNING_CATCH] }) // 1 seule prise

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.notified).toBe(0)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('la copie de la notif insérée est DESCRIPTIVE (aucune formulation prédictive)', async () => {
    setProfiles([{ id: 'u-local', home_department: '29' }])
    setTierByUser({ 'u-local': 'local' })
    setCatchesByUser({ 'u-local': fourMorningCatches })

    await GET(makeRequest())
    const payload = insertSpy.mock.calls[0][0] as { preview_text: string }
    expect(/tu prendras|pêches mieux|prédit|garanti/i.test(payload.preview_text)).toBe(false)
    expect(payload.preview_text.length).toBeLessThanOrEqual(140)
  })
})

describe('cron personal-window — greffon lifecycle (sprint 74)', () => {
  it('appelle le greffon avec une time-box et remonte ses compteurs', async () => {
    runLifecycleGreffonMock.mockResolvedValue({
      j1: 2,
      j3: 1,
      weekly: 3,
      failed: 0,
      timedOut: false,
    })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body.lifecycle).toEqual({ j1: 2, j3: 1, weekly: 3, failed: 0, timedOut: false })
    expect(runLifecycleGreffonMock).toHaveBeenCalledTimes(1)
    // 3e argument = échéance absolue, forcément dans le futur au moment de l'appel.
    expect(runLifecycleGreffonMock.mock.calls[0][2]).toBeGreaterThan(Date.now())
  })

  it('BEST-EFFORT STRICT : un throw du greffon ne casse ni le cron ni le legacy', async () => {
    setProfiles([{ id: 'u-local', home_department: '29' }])
    setTierByUser({ 'u-local': 'local' })
    setCatchesByUser({ 'u-local': fourMorningCatches })
    runLifecycleGreffonMock.mockRejectedValue(new Error('Resend down'))

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    // Le legacy (notif perso de l'abonné Local) a bien tourné malgré l'échec.
    expect(body.notified).toBe(1)
    expect(insertSpy).toHaveBeenCalledTimes(1)
  })

  it('le greffon tourne APRÈS le legacy (aucune notif perso perdue)', async () => {
    setProfiles([{ id: 'u-local', home_department: '29' }])
    setTierByUser({ 'u-local': 'local' })
    setCatchesByUser({ 'u-local': fourMorningCatches })
    runLifecycleGreffonMock.mockImplementation(async () => {
      // À cet instant, l'insert legacy doit déjà avoir eu lieu.
      expect(insertSpy).toHaveBeenCalledTimes(1)
      return { j1: 0, j3: 0, weekly: 0, failed: 0, timedOut: false }
    })

    const res = await GET(makeRequest())
    expect((await res.json()).notified).toBe(1)
    expect(runLifecycleGreffonMock).toHaveBeenCalledTimes(1)
  })
})
