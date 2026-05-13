import { describe, it, expect } from 'vitest'
import { createCatchSchema } from './schema'

const basePayload = {
  species: 'bar',
  technique: 'leurres',
  location_method: 'gps',
  latitude: 47.5,
  longitude: -3.2,
} as const

describe('createCatchSchema', () => {
  it('valide un payload correct avec les defaults attendus', () => {
    const result = createCatchSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.released).toBe(false)
    expect(result.data.privacy).toBe('private')
    expect(result.data.precise_for_friends).toBe(true)
    expect(result.data.reveal_precise_to_public).toBe(false)
  })

  it('rejette une taille négative', () => {
    const result = createCatchSchema.safeParse({ ...basePayload, size_cm: -5 })
    expect(result.success).toBe(false)
    if (result.success) return
    const paths = result.error.issues.map((i) => i.path[0])
    expect(paths).toContain('size_cm')
  })

  it('accepte privacy="public" avec reveal_precise_to_public=true', () => {
    const result = createCatchSchema.safeParse({
      ...basePayload,
      privacy: 'public',
      reveal_precise_to_public: true,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.privacy).toBe('public')
    expect(result.data.reveal_precise_to_public).toBe(true)
  })
})
