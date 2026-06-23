import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────
// next/cache : revalidate* sont des no-op hors runtime Next.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
// Le client Supabase est injecté par test via createClient (mocké).
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
// Open-Meteo : aucune requête réseau pendant les tests. Par défaut, pas de
// conditions (null) — surchargé ponctuellement pour vérifier la dénormalisation.
vi.mock('@/lib/conditions/openmeteo', () => ({ fetchConditionsAt: vi.fn(async () => null) }))

import { createClient } from '@/lib/supabase/server'
import { fetchConditionsAt } from '@/lib/conditions/openmeteo'
import { createCatch, updateCatch, deleteCatch, uploadCatchPhoto, bulkCreateCatches } from '../actions'
import type { CreateCatchInput, UpdateCatchInput } from '../schema'

// ─── Faux client Supabase (capture les payloads insert/update/delete) ─────────
// File FIFO de réponses terminales, consommée par .single()/.maybeSingle()/await.
// L'ordre des terminaux dans chaque action est déterministe.

type Term = { data?: unknown; error?: unknown }
type Op = { table: string; op: 'insert' | 'update' | 'delete'; payload?: unknown }

function makeClient(cfg: {
  user?: { id: string } | null
  responses?: Term[]
  storageUpload?: Term
  storageRemove?: Term
}) {
  const ops: Op[] = []
  const queue = [...(cfg.responses ?? [])]
  const nextTerm = (): Term => (queue.length ? (queue.shift() as Term) : { data: null, error: null })
  const removed: string[][] = []

  const makeBuilder = (table: string) => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'neq', 'in', 'is', 'match', 'order', 'limit', 'range', 'gte', 'gt', 'lt']) {
      b[m] = vi.fn(() => b)
    }
    b.insert = vi.fn((p: unknown) => {
      ops.push({ table, op: 'insert', payload: p })
      return b
    })
    b.update = vi.fn((p: unknown) => {
      ops.push({ table, op: 'update', payload: p })
      return b
    })
    b.delete = vi.fn(() => {
      ops.push({ table, op: 'delete' })
      return b
    })
    b.single = vi.fn(() => Promise.resolve(nextTerm()))
    b.maybeSingle = vi.fn(() => Promise.resolve(nextTerm()))
    b.then = (resolve: (v: Term) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(nextTerm()).then(resolve, reject)
    return b
  }

  const client = {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: cfg.user ?? null }, error: null })),
    },
    from: vi.fn((table: string) => makeBuilder(table)),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve(cfg.storageUpload ?? { error: null })),
        remove: vi.fn((paths: string[]) => {
          removed.push(paths)
          return Promise.resolve(cfg.storageRemove ?? { error: null })
        }),
      })),
    },
  }

  return { client, ops, removed }
}

function inject(client: unknown) {
  vi.mocked(createClient).mockResolvedValue(client as Awaited<ReturnType<typeof createClient>>)
}

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001' }
const CATCH_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

// Input createCatch valide de référence (gps + lat/lng en France métropolitaine).
const validCreate: CreateCatchInput = {
  species: 'bar',
  caught_at: '2026-06-20T08:00:00.000Z',
  technique: 'leurres',
  released: false,
  location_method: 'gps',
  latitude: 47.8,
  longitude: -4.3,
  privacy: 'private',
  precise_for_friends: true,
  reveal_precise_to_public: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchConditionsAt).mockResolvedValue(null as never)
})

// ─── createCatch ──────────────────────────────────────────────────────────────

describe('createCatch', () => {
  it('insère une prise valide et renvoie son id', async () => {
    const { client, ops } = makeClient({
      user: USER,
      responses: [{ data: { id: 'new-id' }, error: null }],
    })
    inject(client)

    const res = await createCatch(validCreate)

    expect(res).toEqual({ id: 'new-id' })
    expect(ops).toHaveLength(1)
    expect(ops[0].table).toBe('catches')
    expect(ops[0].op).toBe('insert')
    const payload = ops[0].payload as Record<string, unknown>
    expect(payload.user_id).toBe(USER.id)
    expect(payload.species).toBe('bar')
    expect(payload.technique).toBe('leurres')
    // geom en EWKT lng/lat (PostGIS attend POINT(lng lat))
    expect(payload.geom).toBe('SRID=4326;POINT(-4.3 47.8)')
  })

  it('applique les valeurs de privacy par défaut quand elles sont omises', async () => {
    const { client, ops } = makeClient({
      user: USER,
      responses: [{ data: { id: 'p1' }, error: null }],
    })
    inject(client)

    // On omet privacy/precise/reveal/released → le schéma zod réinjecte ses defaults.
    const partial = {
      species: 'bar',
      caught_at: '2026-06-20T08:00:00.000Z',
      technique: 'leurres',
      latitude: 47.8,
      longitude: -4.3,
    } as unknown as CreateCatchInput
    const res = await createCatch(partial)

    expect('id' in res).toBe(true)
    const payload = ops[0].payload as Record<string, unknown>
    expect(payload.privacy).toBe('private')
    expect(payload.precise_for_friends).toBe(true)
    expect(payload.reveal_precise_to_public).toBe(false)
    expect(payload.released).toBe(false)
  })

  it('convertit le poids kg → grammes et dénormalise les conditions', async () => {
    vi.mocked(fetchConditionsAt).mockResolvedValue({
      source: 'open-meteo',
      wind_speed_kmh: 18,
      wind_direction_deg: 200,
      tide_state: 'rising',
    } as never)
    const { client, ops } = makeClient({
      user: USER,
      responses: [{ data: { id: 'p2' }, error: null }],
    })
    inject(client)

    await createCatch({ ...validCreate, weight_kg: 2.5 })

    const payload = ops[0].payload as Record<string, unknown>
    expect(payload.weight_g).toBe(2500)
    expect(payload.wind_speed_kmh).toBe(18)
    expect(payload.wind_direction_deg).toBe(200)
    expect(payload.tide_state).toBe('rising')
  })

  it('rejette un input invalide avec un message zod en français (sans insert)', async () => {
    const { client, ops } = makeClient({ user: USER })
    inject(client)

    const bad = { ...validCreate, species: 'requin' } as unknown as CreateCatchInput
    const res = await createCatch(bad)

    expect(res).toEqual({ error: expect.stringContaining('Choisis une espèce') })
    expect(ops).toHaveLength(0)
  })

  it('refuse un utilisateur non authentifié', async () => {
    const { client, ops } = makeClient({ user: null })
    inject(client)

    const res = await createCatch(validCreate)

    expect(res).toEqual({ error: 'Non authentifié' })
    expect(ops).toHaveLength(0)
  })

  it('traduit une erreur d’insert DB en message FR générique', async () => {
    const { client } = makeClient({
      user: USER,
      responses: [{ data: null, error: { message: 'boom' } }],
    })
    inject(client)

    const res = await createCatch(validCreate)
    expect(res).toEqual({ error: expect.stringContaining('Impossible de créer la prise') })
  })
})

// ─── updateCatch ──────────────────────────────────────────────────────────────

describe('updateCatch', () => {
  const validUpdate: UpdateCatchInput = { id: CATCH_ID, size_cm: 42 }

  it('met à jour partiellement une prise possédée', async () => {
    const { client, ops } = makeClient({
      user: USER,
      responses: [
        { data: { id: CATCH_ID, photo_path: null }, error: null }, // fetch existant
        { error: null }, // update
      ],
    })
    inject(client)

    const res = await updateCatch(validUpdate)

    expect(res).toEqual({ ok: true })
    const upd = ops.find((o) => o.op === 'update')
    expect(upd).toBeDefined()
    const payload = upd!.payload as Record<string, unknown>
    expect(payload.size_cm).toBe(42)
    // Les champs non soumis ne sont PAS écrasés (update partiel, pas de defaults).
    expect(payload).not.toHaveProperty('privacy')
    expect(payload).not.toHaveProperty('released')
  })

  it('refuse la mise à jour d’une prise non possédée (aucun update)', async () => {
    const { client, ops } = makeClient({
      user: USER,
      responses: [{ data: null, error: null }], // .eq(user_id) ne trouve rien
    })
    inject(client)

    const res = await updateCatch(validUpdate)

    expect(res).toEqual({ error: expect.stringContaining('accès refusé') })
    expect(ops.some((o) => o.op === 'update')).toBe(false)
  })

  it('refuse un utilisateur non authentifié', async () => {
    const { client } = makeClient({ user: null })
    inject(client)
    const res = await updateCatch(validUpdate)
    expect(res).toEqual({ error: 'Non authentifié' })
  })

  it('convertit le poids kg → grammes en update', async () => {
    const { client, ops } = makeClient({
      user: USER,
      responses: [{ data: { id: CATCH_ID, photo_path: null }, error: null }, { error: null }],
    })
    inject(client)

    await updateCatch({ id: CATCH_ID, weight_kg: 1.2 })
    const upd = ops.find((o) => o.op === 'update')!.payload as Record<string, unknown>
    expect(upd.weight_g).toBe(1200)
  })
})

// ─── deleteCatch ──────────────────────────────────────────────────────────────

describe('deleteCatch', () => {
  it('rejette un id manquant', async () => {
    const { client } = makeClient({ user: USER })
    inject(client)
    const res = await deleteCatch('')
    expect(res).toEqual({ error: 'ID manquant.' })
  })

  it('refuse la suppression d’une prise non possédée (aucun delete)', async () => {
    const { client, ops } = makeClient({
      user: USER,
      responses: [{ data: null, error: null }], // introuvable pour ce user
    })
    inject(client)

    const res = await deleteCatch(CATCH_ID)

    expect(res).toEqual({ error: expect.stringContaining('accès refusé') })
    expect(ops.some((o) => o.op === 'delete')).toBe(false)
  })

  it('supprime une prise possédée et renvoie { ok: true }', async () => {
    const { client, ops } = makeClient({
      user: USER,
      responses: [
        { data: { photo_path: null }, error: null }, // fetch existant
        { error: null }, // delete
      ],
    })
    inject(client)

    const res = await deleteCatch(CATCH_ID)

    expect(res).toEqual({ ok: true })
    expect(ops.some((o) => o.op === 'delete')).toBe(true)
  })

  it('supprime aussi la photo Storage si présente', async () => {
    const { client, removed } = makeClient({
      user: USER,
      responses: [
        { data: { photo_path: `${USER.id}/photo.webp` }, error: null },
        { error: null },
      ],
    })
    inject(client)

    await deleteCatch(CATCH_ID)
    expect(removed).toContainEqual([`${USER.id}/photo.webp`])
  })
})

// ─── uploadCatchPhoto ─────────────────────────────────────────────────────────

describe('uploadCatchPhoto', () => {
  function fd(file: File): FormData {
    const f = new FormData()
    f.append('file', file)
    return f
  }

  it('rejette un fichier manquant', async () => {
    const res = await uploadCatchPhoto(new FormData())
    expect(res).toEqual({ error: 'Fichier manquant.' })
  })

  it('rejette une photo au-dessus de MAX_SIZE_BYTES (1,8 Mo)', async () => {
    // 1,9 Mo > 1,8 Mo : verrouille le bug Sentry JAVASCRIPT-NEXTJS-4 (mur upload).
    const big = new File([new Uint8Array(1.9 * 1024 * 1024)], 'big.webp', { type: 'image/webp' })
    const res = await uploadCatchPhoto(fd(big))
    expect(res).toEqual({ error: expect.stringContaining('1,8 Mo') })
  })

  it('rejette un type ≠ image/webp', async () => {
    const jpg = new File([new Uint8Array(1024)], 'photo.jpg', { type: 'image/jpeg' })
    const res = await uploadCatchPhoto(fd(jpg))
    expect(res).toEqual({ error: expect.stringContaining('WebP') })
  })

  it('upload un webp valide et renvoie un chemin sous l’id utilisateur', async () => {
    const { client } = makeClient({ user: USER, storageUpload: { error: null } })
    inject(client)

    const ok = new File([new Uint8Array(1024)], 'photo.webp', { type: 'image/webp' })
    const res = await uploadCatchPhoto(fd(ok))

    expect('path' in res).toBe(true)
    if ('path' in res) {
      expect(res.path.startsWith(`${USER.id}/`)).toBe(true)
      expect(res.path.endsWith('.webp')).toBe(true)
    }
  })

  it('refuse un utilisateur non authentifié (après les gardes taille/type)', async () => {
    const { client } = makeClient({ user: null })
    inject(client)
    const ok = new File([new Uint8Array(1024)], 'photo.webp', { type: 'image/webp' })
    const res = await uploadCatchPhoto(fd(ok))
    expect(res).toEqual({ error: 'Non authentifié' })
  })
})

// ─── bulkCreateCatches (import de prises passées, WS-C) ────────────────────────

type BulkArg = Parameters<typeof bulkCreateCatches>[0]

describe('bulkCreateCatches', () => {
  it('importe plusieurs prises passées (coords dépt + defaults privacy)', async () => {
    const { client, ops } = makeClient({
      user: USER,
      responses: [{ data: [{ id: 'a' }, { id: 'b' }], error: null }],
    })
    inject(client)

    const rows = [
      { species: 'bar', caught_at: '2026-06-20T12:00:00.000Z', department: '29' },
      { species: 'dorade_royale', caught_at: '2026-05-01T12:00:00.000Z', size_cm: 35, department: '13' },
    ] as unknown as BulkArg

    const res = await bulkCreateCatches(rows)

    expect(res).toEqual({ inserted: 2 })
    const insert = ops.find((o) => o.op === 'insert')!
    const payload = insert.payload as Array<Record<string, unknown>>
    expect(payload).toHaveLength(2)
    expect(payload[0].user_id).toBe(USER.id)
    expect(payload[0].location_method).toBe('manual')
    expect(payload[0].privacy).toBe('private')
    expect(payload[0].precise_for_friends).toBe(true)
    expect(payload[0].technique).toBeNull()
    expect(payload[0].geom).toContain('SRID=4326;POINT(')
    expect(payload[1].size_cm).toBe(35)
  })

  it('rejette un département non côtier (message zod FR, aucun insert)', async () => {
    const { client, ops } = makeClient({ user: USER })
    inject(client)
    const rows = [
      { species: 'bar', caught_at: '2026-06-20T12:00:00.000Z', department: '75' },
    ] as unknown as BulkArg
    const res = await bulkCreateCatches(rows)
    expect(res).toEqual({ error: expect.stringContaining('côtier') })
    expect(ops.some((o) => o.op === 'insert')).toBe(false)
  })

  it('refuse un utilisateur non authentifié', async () => {
    const { client } = makeClient({ user: null })
    inject(client)
    const rows = [
      { species: 'bar', caught_at: '2026-06-20T12:00:00.000Z', department: '29' },
    ] as unknown as BulkArg
    const res = await bulkCreateCatches(rows)
    expect(res).toEqual({ error: 'Non authentifié' })
  })

  it('rejette une liste vide', async () => {
    const { client } = makeClient({ user: USER })
    inject(client)
    const res = await bulkCreateCatches([] as unknown as BulkArg)
    expect('error' in res).toBe(true)
  })
})
