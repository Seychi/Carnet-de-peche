import { describe, it, expect } from 'vitest'
import { createOutingSchema } from '../schema'

const base = {
  started_at: '2026-06-20T07:00:00.000Z',
  department: '29',
}

describe('createOutingSchema', () => {
  it('accepte une sortie minimale (started_at + département côtier)', () => {
    const r = createOutingSchema.safeParse(base)
    expect(r.success).toBe(true)
  })

  it('refuse un département non côtier', () => {
    const r = createOutingSchema.safeParse({ ...base, department: '75' })
    expect(r.success).toBe(false)
  })

  it('refuse une fin de sortie avant le début', () => {
    const r = createOutingSchema.safeParse({
      ...base,
      ended_at: '2026-06-20T05:00:00.000Z',
    })
    expect(r.success).toBe(false)
  })

  it('accepte technique + espèces visées + notes', () => {
    const r = createOutingSchema.safeParse({
      ...base,
      ended_at: '2026-06-20T11:00:00.000Z',
      technique: 'surfcasting',
      species_targeted: ['bar', 'lieu_jaune'],
      notes: 'Mer plate, rien vu.',
    })
    expect(r.success).toBe(true)
  })

  it('refuse une espèce inconnue dans species_targeted', () => {
    const r = createOutingSchema.safeParse({ ...base, species_targeted: ['licorne'] })
    expect(r.success).toBe(false)
  })

  it('refuse une technique invalide', () => {
    const r = createOutingSchema.safeParse({ ...base, technique: 'dynamite' })
    expect(r.success).toBe(false)
  })

  it('refuse une sortie dans le futur (garde notFuture, sprint 53)', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(createOutingSchema.safeParse({ ...base, started_at: future }).success).toBe(false)
  })
})
