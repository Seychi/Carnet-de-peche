import { describe, it, expect, vi } from 'vitest'

// createClient n'est PAS appelé ici (on injecte un faux client), mais celebration.ts
// importe badges.ts qui importe le client serveur → on le neutralise à l'import.
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { buildCatchCelebration } from '../celebration'

// ─── Faux client Supabase minimal (chaînes utilisées par buildCatchCelebration) ──
// - xp_events : select().eq().eq().eq() puis await → { data: xpEvents }
// - catches   : select().eq().eq().not().neq().order().limit().maybeSingle()
// - rpc('recompute_my_badges') → { data: badges }

function mockClient(opts: {
  xpEvents?: { kind: string; points: number }[]
  prevBest?: number | null
  badges?: { badge_slug: string; earned_at: string }[]
}) {
  const xpEvents = opts.xpEvents ?? []
  const prevBest = opts.prevBest ?? null
  const badges = opts.badges ?? []

  const catchesBuilder: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'not', 'neq', 'order', 'limit']) {
    catchesBuilder[m] = () => catchesBuilder
  }
  catchesBuilder.maybeSingle = () =>
    Promise.resolve({
      data: prevBest != null ? { measured_length_cm: prevBest } : null,
      error: null,
    })

  const xpBuilder: Record<string, unknown> = {}
  xpBuilder.select = () => xpBuilder
  xpBuilder.eq = () => xpBuilder
  xpBuilder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: xpEvents, error: null }).then(resolve)

  return {
    from: (table: string) => (table === 'catches' ? catchesBuilder : xpBuilder),
    rpc: vi.fn(() => Promise.resolve({ data: badges, error: null })),
  } as never
}

const BASE = {
  userId: 'u1',
  catchId: 'c1',
  species: 'bar',
  catchCreatedAt: '2026-07-01T10:00:00.000Z',
}

describe('buildCatchCelebration', () => {
  it('détecte un record perso mesuré + une nouvelle espèce (depuis le ledger)', async () => {
    const client = mockClient({
      xpEvents: [
        { kind: 'catch', points: 10 },
        { kind: 'new_species', points: 50 },
        { kind: 'personal_best', points: 30 },
        { kind: 'measured', points: 15 },
      ],
      prevBest: 55,
    })

    const res = await buildCatchCelebration(client, { ...BASE, measuredLength: 62 })

    expect(res).not.toBeNull()
    expect(res!.newRecord).toEqual({ species: 'bar', length: 62, previousBest: 55 })
    expect(res!.newSpecies).toBe(true)
    expect(res!.xpByKind.personal_best).toBe(30)
    expect(res!.xpByKind.new_species).toBe(50)
    expect(res!.xpGained).toBe(105)
  })

  it('ne fête RIEN quand la prise n’octroie qu’un simple « catch »', async () => {
    const client = mockClient({ xpEvents: [{ kind: 'catch', points: 10 }] })
    const res = await buildCatchCelebration(client, { ...BASE, measuredLength: null })
    expect(res).toBeNull()
  })

  it('ne construit PAS de record sans personal_best dans le ledger (pas de faux positif)', async () => {
    const client = mockClient({
      xpEvents: [
        { kind: 'catch', points: 10 },
        { kind: 'new_species', points: 50 },
      ],
    })
    const res = await buildCatchCelebration(client, { ...BASE, measuredLength: null })
    expect(res).not.toBeNull()
    expect(res!.newRecord).toBeNull()
    expect(res!.newSpecies).toBe(true)
  })

  it('ne remonte QUE les badges débloqués à ce log (earned_at >= created_at)', async () => {
    const client = mockClient({
      xpEvents: [{ kind: 'catch', points: 10 }],
      badges: [
        { badge_slug: 'first_catch', earned_at: '2026-07-01T10:00:05.000Z' }, // pendant ce log
        { badge_slug: 'ten_catches', earned_at: '2026-06-01T10:00:00.000Z' }, // ancien
      ],
    })
    const res = await buildCatchCelebration(client, { ...BASE, measuredLength: null })
    expect(res).not.toBeNull()
    expect(res!.newBadges.map((b) => b.slug)).toEqual(['first_catch'])
  })

  it('ne détecte AUCUN badge sans created_at (évite de re-fêter d’anciens badges)', async () => {
    const client = mockClient({
      xpEvents: [{ kind: 'catch', points: 10 }],
      badges: [{ badge_slug: 'first_catch', earned_at: '2026-07-01T10:00:05.000Z' }],
    })
    const res = await buildCatchCelebration(client, {
      ...BASE,
      catchCreatedAt: null,
      measuredLength: null,
    })
    expect(res).toBeNull()
  })
})
