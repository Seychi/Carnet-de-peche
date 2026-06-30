import { describe, it, expect } from 'vitest'
import { buildFeedCursor, parseFeedCursor } from '../cursor'

// Sprint 54 WS-E : le curseur composite created_at|id évite de SAUTER des posts
// au même created_at à cheval sur une page (régression du curseur created_at-seul,
// déclenchée par un seed/bulk insert au même timestamp).
//
// On simule en mémoire le tri (created_at desc, id desc) + le filtre composite,
// pour prouver l'absence de saut sans dépendre du tri réel du mock Supabase.

type Row = { created_at: string; id: string }

function sortDesc(rows: Row[]): Row[] {
  return [...rows].sort((a, b) =>
    a.created_at !== b.created_at
      ? b.created_at.localeCompare(a.created_at)
      : b.id.localeCompare(a.id),
  )
}

function pageAfter(all: Row[], cursor: string | null, size: number): Row[] {
  const sorted = sortDesc(all)
  let pool = sorted
  if (cursor) {
    const c = parseFeedCursor(cursor)
    pool = c
      ? sorted.filter((r) => r.created_at < c.ts || (r.created_at === c.ts && r.id < c.id))
      : sorted.filter((r) => r.created_at < cursor) // fallback legacy (created_at seul)
  }
  return pool.slice(0, size)
}

describe('curseur fil composite (WS-E)', () => {
  it('pagine N posts au MÊME created_at sans saut ni doublon', () => {
    const TS = '2026-06-29T10:00:00Z'
    const all: Row[] = Array.from({ length: 25 }, (_, i) => ({
      created_at: TS,
      id: `id-${String(i).padStart(2, '0')}`,
    }))

    const seen: string[] = []
    let cursor: string | null = null
    for (let guard = 0; guard < 10; guard++) {
      const page = pageAfter(all, cursor, 20)
      if (page.length === 0) break
      seen.push(...page.map((r) => r.id))
      cursor = page.length === 20 ? buildFeedCursor(page[page.length - 1]) : null
      if (!cursor) break
    }

    expect(seen.length).toBe(25) // aucun saut
    expect(new Set(seen).size).toBe(25) // aucun doublon
    expect([...seen].sort()).toEqual(all.map((r) => r.id).sort()) // tous présents
  })

  it('buildFeedCursor renvoie null si created_at ou id manque', () => {
    expect(buildFeedCursor({ created_at: null, id: 'x' })).toBeNull()
    expect(buildFeedCursor({ created_at: '2026-01-01T00:00:00Z', id: null })).toBeNull()
  })

  it('parseFeedCursor splitte sur le premier « | » (created_at contient « : »)', () => {
    expect(parseFeedCursor('2026-06-29T10:00:00Z|id-07')).toEqual({
      ts: '2026-06-29T10:00:00Z',
      id: 'id-07',
    })
  })

  it('parseFeedCursor renvoie null sur un curseur legacy (created_at seul)', () => {
    expect(parseFeedCursor('2026-06-29T10:00:00Z')).toBeNull()
  })
})
