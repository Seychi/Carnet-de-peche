import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import {
  createPost,
  addComment,
  moderatorDeletePost,
  moderatorDeleteComment,
} from '../feed'

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }
const POST = 'bbbbbbbb-0000-4000-8000-000000000001'
const COMMENT = 'dddddddd-0000-4000-8000-000000000001'

function mock(opts: Parameters<typeof makeSupabase>[0]) {
  ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase(opts))
}

beforeEach(() => vi.clearAllMocks())

// ─── Anti-spam (sprint 10.6 WS B) ─────────────────────────────────────────────

describe('createPost — filtre anti-spam', () => {
  it('rejette le post arnaque réel de l’audit (gift cards + code promo)', async () => {
    mock({ user: USER })
    const r = await createPost({
      text: 'Gift Cards #1 — Genuine Code: OP-SBNG-TFBC — Please contact us…',
      region: '29',
    })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('spam') })
  })

  it('rejette un message avec plus d’un lien', async () => {
    mock({ user: USER })
    const r = await createPost({
      text: 'Regarde https://a.example.com et https://b.example.com',
      region: '29',
    })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('spam') })
  })

  it.each([
    'Profite du coupon code PECHE2026',
    'Écris-moi sur WhatsApp +33 6 12 34 56 78',
    'Rejoins le telegram @ superpromos',
  ])('rejette le pattern spam : %s', async (text) => {
    mock({ user: USER })
    const r = await createPost({ text, region: '29' })
    expect(r.ok).toBe(false)
  })

  it('laisse passer un post avec UN lien vers un article météo (pas de faux positif)', async () => {
    mock({
      user: USER,
      tables: { feed_posts: [{ count: 0 }, { data: { id: 'p1' }, error: null }] },
    })
    const r = await createPost({
      text: 'Gros coefficient annoncé ce week-end : https://meteofrance.com/marine — qui sort ?',
      region: '29',
    })
    expect(r).toEqual({ ok: true, data: { id: 'p1' } })
  })

  it('ne matche pas les mots composés français (Pen-Hir, Camaret-sur-Mer)', async () => {
    mock({
      user: USER,
      tables: { feed_posts: [{ count: 0 }, { data: { id: 'p2' }, error: null }] },
    })
    const r = await createPost({
      text: 'Belle session à Pen-Hir puis Camaret-sur-Mer, deux bars maillés.',
      region: '29',
    })
    expect(r).toEqual({ ok: true, data: { id: 'p2' } })
  })
})

describe('addComment — filtre anti-spam', () => {
  it('rejette un commentaire spam avec erreur française', async () => {
    mock({ user: USER, tables: { feed_posts: { data: { region: '29' } } } })
    const r = await addComment(POST, 'Genuine gift card here, contact us')
    expect(r).toEqual({ ok: false, error: expect.stringContaining('reformule') })
  })

  it('laisse passer un commentaire normal', async () => {
    mock({
      user: USER,
      tables: {
        feed_posts: { data: { region: '29' } },
        feed_comments: [{ count: 0 }, { data: { id: 'c1' }, error: null }],
      },
    })
    const r = await addComment(POST, 'Joli poisson, bravo !')
    expect(r).toEqual({ ok: true, data: { id: 'c1' } })
  })
})

// ─── Suppression modérateur (migration 023) ──────────────────────────────────

describe('moderatorDeletePost', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await moderatorDeletePost(POST)).ok).toBe(false)
  })

  it('refuse un utilisateur non modérateur', async () => {
    mock({
      user: USER,
      tables: { profiles: { data: { is_moderator: false } } },
    })
    const r = await moderatorDeletePost(POST)
    expect(r).toEqual({ ok: false, error: expect.stringContaining('modérateur') })
  })

  it('supprime le post et trace une ligne reports resolved pour un modérateur', async () => {
    const supabase = makeSupabase({
      user: USER,
      tables: {
        profiles: { data: { is_moderator: true } },
        feed_posts: { data: [{ id: POST, region: '29' }], error: null },
        reports: [{ error: null }, { error: null }],
      },
    })
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(supabase)

    const r = await moderatorDeletePost(POST)
    expect(r).toEqual({ ok: true, data: { id: POST } })

    // La trace d'audit : insert sur reports avec status resolved + resolved_by.
    const reportsBuilders = supabase.from.mock.calls
      .map((call, i) => ({ table: call[0], builder: supabase.from.mock.results[i].value }))
      .filter((c) => c.table === 'reports')
    expect(reportsBuilders.length).toBeGreaterThanOrEqual(1)
    const insertPayload = reportsBuilders[0].builder.insert.mock.calls[0][0]
    expect(insertPayload).toMatchObject({
      target_type: 'post',
      target_id: POST,
      status: 'resolved',
      resolved_by: USER.id,
    })
  })

  // Sprint 52 WS-C : un post déjà supprimé (0 ligne) est désormais un succès
  // idempotent (l'intention est satisfaite) ET le signalement est résolu, plutôt
  // qu'une erreur trompeuse (« le bouton ne fait rien »).
  it('traite un post déjà supprimé comme un succès idempotent et résout le signalement', async () => {
    const supabase = makeSupabase({
      user: USER,
      tables: {
        profiles: { data: { is_moderator: true } },
        feed_posts: { data: [], error: null },
        reports: [{ error: null }, { error: null }],
      },
    })
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(supabase)

    const r = await moderatorDeletePost(POST)
    expect(r).toEqual({ ok: true, data: { id: POST } })

    // Le signalement est résolu même si le post avait déjà disparu.
    const touchedReports = supabase.from.mock.calls.some((call) => call[0] === 'reports')
    expect(touchedReports).toBe(true)
  })

  it('échoue (erreur surfacée) si la suppression DB renvoie une vraie erreur', async () => {
    mock({
      user: USER,
      tables: {
        profiles: { data: { is_moderator: true } },
        feed_posts: { data: null, error: { message: 'db down' } },
      },
    })
    expect((await moderatorDeletePost(POST)).ok).toBe(false)
  })
})

describe('moderatorDeleteComment', () => {
  it('refuse un non-modérateur', async () => {
    mock({ user: USER, tables: { profiles: { data: { is_moderator: false } } } })
    expect((await moderatorDeleteComment(COMMENT)).ok).toBe(false)
  })

  it('supprime le commentaire pour un modérateur', async () => {
    mock({
      user: USER,
      tables: {
        profiles: { data: { is_moderator: true } },
        feed_comments: { data: [{ id: COMMENT }], error: null },
        reports: [{ error: null }, { error: null }],
      },
    })
    expect(await moderatorDeleteComment(COMMENT)).toEqual({ ok: true, data: { id: COMMENT } })
  })

  // Sprint 52 WS-C : symétrie avec le post (commentaire déjà supprimé = idempotent).
  it('traite un commentaire déjà supprimé comme un succès idempotent', async () => {
    const supabase = makeSupabase({
      user: USER,
      tables: {
        profiles: { data: { is_moderator: true } },
        feed_comments: { data: [], error: null },
        reports: [{ error: null }, { error: null }],
      },
    })
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(supabase)
    expect(await moderatorDeleteComment(COMMENT)).toEqual({ ok: true, data: { id: COMMENT } })
  })
})
