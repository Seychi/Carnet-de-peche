import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabase } from './_supabase-mock'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import {
  createPost,
  toggleLike,
  addComment,
  deletePost,
  deleteComment,
  reportPost,
  getComments,
} from '../feed'

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }
const POST = 'bbbbbbbb-0000-4000-8000-000000000001'
const CATCH = 'cccccccc-0000-4000-8000-000000000001'
const COMMENT = 'dddddddd-0000-4000-8000-000000000001'

function mock(opts: Parameters<typeof makeSupabase>[0]) {
  ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabase(opts))
}

beforeEach(() => vi.clearAllMocks())

describe('createPost', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    const r = await createPost({ text: 'Salut', region: '29' })
    expect(r.ok).toBe(false)
  })

  it('refuse un département non côtier', async () => {
    mock({ user: USER })
    const r = await createPost({ text: 'Salut', region: '75' })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('département') })
  })

  it('refuse un post vide (ni texte ni prise)', async () => {
    mock({ user: USER })
    const r = await createPost({ text: '   ', region: '29' })
    expect(r.ok).toBe(false)
  })

  it('accepte un user sans abonnement (social gratuit)', async () => {
    // Aucun tier mocké : un compte discovery publie comme les autres.
    mock({
      user: USER,
      tables: { feed_posts: [{ count: 0 }, { data: { id: 'p0' }, error: null }] },
    })
    const r = await createPost({ text: 'Salut', region: '29' })
    expect(r).toEqual({ ok: true, data: { id: 'p0' } })
  })

  it('refuse le 11e post en 24h (rate-limit)', async () => {
    mock({ user: USER, tables: { feed_posts: { count: 10 } } })
    const r = await createPost({ text: 'Salut', region: '29' })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('10 posts') })
  })

  it('traduit l’erreur du trigger DB rate_limit_posts (backstop)', async () => {
    mock({
      user: USER,
      tables: {
        feed_posts: [{ count: 0 }, { data: null, error: { message: 'rate_limit_posts' } }],
      },
    })
    const r = await createPost({ text: 'Salut', region: '29' })
    expect(r).toEqual({ ok: false, error: expect.stringContaining('10 posts') })
  })

  it('refuse de partager une prise qui ne nous appartient pas', async () => {
    mock({
      user: USER,
      tables: { feed_posts: { count: 0 }, catches: { data: null } },
    })
    const r = await createPost({ catchId: CATCH, region: '29' })
    expect(r.ok).toBe(false)
  })

  it('publie un post texte (happy path)', async () => {
    mock({
      user: USER,
      tables: { feed_posts: [{ count: 0 }, { data: { id: 'p1' }, error: null }] },
    })
    const r = await createPost({ text: 'Belle session', region: '29' })
    expect(r).toEqual({ ok: true, data: { id: 'p1' } })
  })

  it('publie un post avec une prise possédée', async () => {
    mock({
      user: USER,
      tables: {
        catches: { data: { id: CATCH } },
        feed_posts: [{ count: 0 }, { data: { id: 'p2' }, error: null }],
      },
    })
    const r = await createPost({ catchId: CATCH, region: '29' })
    expect(r).toEqual({ ok: true, data: { id: 'p2' } })
  })

  it('remonte une erreur si l’insert échoue', async () => {
    mock({
      user: USER,
      tables: { feed_posts: [{ count: 0 }, { data: null, error: { message: 'boom' } }] },
    })
    const r = await createPost({ text: 'Salut', region: '29' })
    expect(r.ok).toBe(false)
  })
})

describe('toggleLike', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await toggleLike(POST)).ok).toBe(false)
  })

  it('refuse un postId invalide', async () => {
    mock({ user: USER })
    expect((await toggleLike('pas-un-uuid')).ok).toBe(false)
  })

  it('refuse si le post est introuvable', async () => {
    mock({ user: USER, tables: { feed_posts: { data: null } } })
    expect((await toggleLike(POST)).ok).toBe(false)
  })

  it('like un post non encore aimé (sans abonnement — social gratuit)', async () => {
    mock({
      user: USER,
      tables: { feed_posts: { data: { region: '29' } }, feed_likes: [{ data: null }, { error: null }] },
    })
    expect(await toggleLike(POST)).toEqual({ ok: true, data: { liked: true } })
  })

  it('unlike un post déjà aimé', async () => {
    mock({
      user: USER,
      tables: {
        feed_posts: { data: { region: '29' } },
        feed_likes: [{ data: { post_id: POST } }, { error: null }],
      },
    })
    expect(await toggleLike(POST)).toEqual({ ok: true, data: { liked: false } })
  })
})

describe('addComment', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await addComment(POST, 'Bien joué')).ok).toBe(false)
  })

  it('refuse un commentaire vide', async () => {
    mock({ user: USER })
    expect((await addComment(POST, '   ')).ok).toBe(false)
  })

  it('refuse si le post est introuvable', async () => {
    mock({ user: USER, tables: { feed_posts: { data: null } } })
    expect((await addComment(POST, 'Bien joué')).ok).toBe(false)
  })

  it('refuse le 51e commentaire en 24h (rate-limit)', async () => {
    mock({
      user: USER,
      tables: { feed_posts: { data: { region: '29' } }, feed_comments: { count: 50 } },
    })
    const r = await addComment(POST, 'Bien joué')
    expect(r).toEqual({ ok: false, error: expect.stringContaining('50 commentaires') })
  })

  it('traduit l’erreur du trigger DB rate_limit_comments (backstop)', async () => {
    mock({
      user: USER,
      tables: {
        feed_posts: { data: { region: '29' } },
        feed_comments: [{ count: 0 }, { data: null, error: { message: 'rate_limit_comments' } }],
      },
    })
    const r = await addComment(POST, 'Bien joué')
    expect(r).toEqual({ ok: false, error: expect.stringContaining('50 commentaires') })
  })

  it('ajoute un commentaire (happy path, sans abonnement — social gratuit)', async () => {
    mock({
      user: USER,
      tables: {
        feed_posts: { data: { region: '29' } },
        feed_comments: [{ count: 0 }, { data: { id: 'cm1' }, error: null }],
      },
    })
    expect(await addComment(POST, 'Bien joué')).toEqual({ ok: true, data: { id: 'cm1' } })
  })
})

describe('deletePost', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await deletePost(POST)).ok).toBe(false)
  })

  it('refuse un id invalide', async () => {
    mock({ user: USER })
    expect((await deletePost('xxx')).ok).toBe(false)
  })

  it('refuse si rien n’est supprimé (pas à moi / inexistant)', async () => {
    mock({ user: USER, tables: { feed_posts: { data: [], error: null } } })
    expect((await deletePost(POST)).ok).toBe(false)
  })

  it('supprime mon post (happy path)', async () => {
    mock({ user: USER, tables: { feed_posts: { data: [{ id: POST, region: '29' }], error: null } } })
    expect(await deletePost(POST)).toEqual({ ok: true, data: { id: POST } })
  })
})

describe('deleteComment', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await deleteComment(COMMENT)).ok).toBe(false)
  })

  it('refuse si rien n’est supprimé', async () => {
    mock({ user: USER, tables: { feed_comments: { data: [], error: null } } })
    expect((await deleteComment(COMMENT)).ok).toBe(false)
  })

  it('supprime mon commentaire (happy path)', async () => {
    mock({ user: USER, tables: { feed_comments: { data: [{ id: COMMENT }], error: null } } })
    expect(await deleteComment(COMMENT)).toEqual({ ok: true, data: { id: COMMENT } })
  })
})

describe('reportPost', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await reportPost(POST, 'spam')).ok).toBe(false)
  })

  it('refuse une raison invalide', async () => {
    mock({ user: USER })
    // @ts-expect-error raison hors enum volontairement
    expect((await reportPost(POST, 'nimporte')).ok).toBe(false)
  })

  it('enregistre un signalement (happy path)', async () => {
    mock({ user: USER, tables: { reports: [{ error: null }, { count: 1 }] } })
    expect(await reportPost(POST, 'inapproprie', 'Contenu choquant')).toEqual({ ok: true, data: undefined })
  })

  it('warn quand un post dépasse 3 signalements', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mock({ user: USER, tables: { reports: [{ error: null }, { count: 5 }] } })
    const r = await reportPost(POST, 'spam')
    expect(r.ok).toBe(true)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('getComments', () => {
  it('refuse un anonyme', async () => {
    mock({ user: null })
    expect((await getComments(POST)).ok).toBe(false)
  })

  it('renvoie [] si aucun commentaire', async () => {
    mock({ user: USER, tables: { feed_comments: { data: [] } } })
    expect(await getComments(POST)).toEqual({ ok: true, data: [] })
  })

  it('joint l’auteur à chaque commentaire', async () => {
    mock({
      user: USER,
      tables: {
        feed_comments: {
          data: [{ id: 'cm1', text: 'Top', created_at: '2026-05-21T10:00:00Z', author_id: 'u9' }],
        },
        profiles: { data: [{ id: 'u9', username: 'bob', display_name: 'Bob', avatar_url: null }] },
      },
    })
    const r = await getComments(POST)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data[0]?.author_username).toBe('bob')
      expect(r.data[0]?.text).toBe('Top')
    }
  })
})
