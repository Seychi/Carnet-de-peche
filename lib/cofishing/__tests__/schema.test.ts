import { describe, it, expect } from 'vitest'
import { proposeOutingSchema } from '../schema'

// planned_at RELATIF (sprint 53) : doit rester dans le futur pour passer la garde
// notPast, sinon le test casserait mécaniquement avec le temps (date fixe → passé).
const base = {
  department: '56',
  planned_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
}

describe('proposeOutingSchema (co-pêchage)', () => {
  it('accepte une proposition minimale (dépt + date)', () => {
    expect(proposeOutingSchema.safeParse(base).success).toBe(true)
  })

  it('refuse un département non côtier', () => {
    expect(proposeOutingSchema.safeParse({ ...base, department: '75' }).success).toBe(false)
  })

  it('accepte libellé libre + capacité + notes', () => {
    const r = proposeOutingSchema.safeParse({
      ...base,
      area_label: 'Digue nord',
      capacity: 4,
      notes: 'Surfcasting de nuit, niveau débutant ok.',
    })
    expect(r.success).toBe(true)
  })

  it('refuse une capacité hors bornes', () => {
    expect(proposeOutingSchema.safeParse({ ...base, capacity: 0 }).success).toBe(false)
    expect(proposeOutingSchema.safeParse({ ...base, capacity: 99 }).success).toBe(false)
  })

  it('n’accepte AUCUN champ de coordonnée (lat/lng/geom ignorés, jamais stockés)', () => {
    const r = proposeOutingSchema.safeParse({ ...base, lat: 47.1, lng: -2.3 })
    // zod strip les clés inconnues par défaut → le parse réussit mais lat/lng
    // n'existent pas dans le type de sortie (donc jamais transmis à l'insert).
    expect(r.success).toBe(true)
    if (r.success) {
      expect('lat' in r.data).toBe(false)
      expect('lng' in r.data).toBe(false)
    }
  })

  it('rejette une coordonnée tapée en texte libre (area_label / notes) — garde-fou D-D3', () => {
    expect(proposeOutingSchema.safeParse({ ...base, area_label: 'RDV 47.2744, -1.5012' }).success).toBe(false)
    expect(proposeOutingSchema.safeParse({ ...base, notes: 'le spot est à 43,5567 N' }).success).toBe(false)
  })

  it('autorise un repère libre et une heure (pas un motif de coordonnée)', () => {
    expect(proposeOutingSchema.safeParse({ ...base, area_label: 'Digue nord, RDV 7.30' }).success).toBe(true)
  })

  it('refuse une proposition dans le passé (garde notPast, sprint 53)', () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(proposeOutingSchema.safeParse({ ...base, planned_at: past }).success).toBe(false)
  })
})
