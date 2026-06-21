import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Garde-fou anti-régression (BUG-13) : la migration 030 DOIT mettre les deux FK
// bloquantes vers profiles(id) en ON DELETE SET NULL, sinon la suppression d'un
// compte ayant modéré un post / résolu un signalement échouera (cascade auth.users).
// Pas de DB en Vitest (env node) → on assert sur le contenu du fichier de migration.
describe('migration 030 — FK suppression de compte en ON DELETE SET NULL', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/030_account_deletion_fks.sql'),
    'utf8',
  ).toLowerCase()

  it('feed_posts.moderated_by passe en on delete set null', () => {
    expect(sql).toContain('feed_posts_moderated_by_fkey')
    expect(sql).toMatch(
      /moderated_by\)\s*references\s+public\.profiles\(id\)\s+on delete set null/,
    )
  })

  it('reports.resolved_by passe en on delete set null', () => {
    expect(sql).toContain('reports_resolved_by_fkey')
    expect(sql).toMatch(
      /resolved_by\)\s*references\s+public\.profiles\(id\)\s+on delete set null/,
    )
  })

  it('ne pose que des SET NULL (jamais de cascade sur ces deux FK)', () => {
    // ≥ 2 : les 2 contraintes réelles + d'éventuelles mentions en commentaire.
    expect((sql.match(/on delete set null/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(sql).not.toContain('on delete cascade')
  })
})
