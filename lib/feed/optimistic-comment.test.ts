import { describe, it, expect } from 'vitest'
import { buildOptimisticComment } from './optimistic-comment'

const base = { id: 'u1', username: 'jean', display_name: 'Jean', avatar_url: 'https://x/a.webp' }

describe('buildOptimisticComment', () => {
  it('reprend la vraie identité du viewer', () => {
    const c = buildOptimisticComment(base, 'salut', 'temp-1')
    expect(c).toMatchObject({
      id: 'temp-1',
      text: 'salut',
      author_id: 'u1',
      author_username: 'jean',
      author_display_name: 'Jean',
      author_avatar_url: 'https://x/a.webp',
    })
    expect(typeof c.created_at).toBe('string')
  })

  it('garde un libellé de repli quand le profil est incomplet', () => {
    const c = buildOptimisticComment({ id: 'u2', username: null, display_name: null, avatar_url: null }, 'hey', 'temp-2')
    expect(c.author_display_name).toBe('Toi')
    expect(c.author_username).toBeNull()
  })
})
