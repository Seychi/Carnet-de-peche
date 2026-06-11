import { vi } from 'vitest'

// Réponse simulée d'une opération Supabase (terminal d'une chaîne).
export type MockResp = { data?: unknown; error?: unknown; count?: number }

type Tables = Record<string, MockResp | MockResp[]>

/**
 * Fabrique un faux client Supabase pour tester les Server Actions.
 *
 * - `user` : objet renvoyé par auth.getUser() (null = anonyme).
 * - `rpc`  : map nom_rpc -> réponse.
 * - `tables` : map nom_table -> réponse, OU tableau de réponses consommées dans
 *   l'ordre (file) si la même table est requêtée plusieurs fois dans l'action.
 *
 * Toutes les méthodes de chaînage renvoient le builder. Les terminaux sont
 * `.single()` / `.maybeSingle()` (Promise) et l'attente directe du builder
 * (thenable) pour les chaînes sans single (insert/delete/count).
 */
export function makeSupabase(opts: { user?: unknown; rpc?: Record<string, MockResp>; tables?: Tables }) {
  const tables = opts.tables ?? {}

  const nextResp = (table: string): MockResp => {
    const t = tables[table]
    if (Array.isArray(t)) return t.length ? (t.shift() as MockResp) : { data: null, error: null }
    return t ?? { data: null, error: null }
  }

  const builder = (table: string) => {
    let cached: MockResp | undefined
    const get = () => (cached ??= nextResp(table))
    const b: Record<string, unknown> = {}
    for (const m of [
      'select', 'insert', 'update', 'delete',
      'eq', 'neq', 'in', 'not', 'is', 'match', 'order', 'limit', 'range', 'gte', 'lt',
    ]) {
      b[m] = vi.fn(() => b)
    }
    b.single = vi.fn(() => Promise.resolve(get()))
    b.maybeSingle = vi.fn(() => Promise.resolve(get()))
    b.then = (resolve: (v: MockResp) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(get()).then(resolve, reject)
    return b
  }

  return {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: opts.user ?? null }, error: null })),
    },
    rpc: vi.fn((name: string) => Promise.resolve(opts.rpc?.[name] ?? { data: null, error: null })),
    from: vi.fn((table: string) => builder(table)),
  }
}
