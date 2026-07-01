import { describe, it, expect } from 'vitest'
import {
  createCatchSchema,
  updateCatchSchema,
  isInFranceMetro,
  FRANCE_METRO_BBOX,
} from '../schema'

// ─── updateCatchSchema : update partiel ──────────────────────────────────────
// Bug audit 2026-06-11 (Conservé→Relâché) : un update partiel ne doit JAMAIS
// réinjecter les valeurs par défaut du schéma de création (released=true depuis le
// sprint 59, caught_at=now) — sinon l'action écrase des champs non soumis en base.

describe('updateCatchSchema — update partiel', () => {
  const ID = '4f1f06a2-95a1-4c1e-9f57-1d2f0a6c8b3e'

  it("ne réinjecte pas released quand il n'est pas soumis", () => {
    const parsed = updateCatchSchema.parse({ id: ID, species: 'bar' })
    expect(parsed.released).toBeUndefined()
  })

  it('ne réinjecte pas caught_at ni privacy quand ils ne sont pas soumis', () => {
    const parsed = updateCatchSchema.parse({ id: ID, size_cm: 42 })
    expect(parsed.caught_at).toBeUndefined()
    expect(parsed.privacy).toBeUndefined()
    expect(parsed.precise_for_friends).toBeUndefined()
    expect(parsed.reveal_precise_to_public).toBeUndefined()
  })

  it('conserve released quand il est explicitement soumis', () => {
    expect(updateCatchSchema.parse({ id: ID, released: true }).released).toBe(true)
    expect(updateCatchSchema.parse({ id: ID, released: false }).released).toBe(false)
  })
})

// ─── isInFranceMetro ─────────────────────────────────────────────────────────

describe('isInFranceMetro — bbox France métropolitaine', () => {
  it('accepte la pointe du Finistère (48.0, -4.7)', () => {
    expect(isInFranceMetro(48.0, -4.7)).toBe(true)
  })

  it('accepte la Méditerranée (43.1, 5.9) et la Manche (50.9, 1.6)', () => {
    expect(isInFranceMetro(43.1, 5.9)).toBe(true)
    expect(isInFranceMetro(50.9, 1.6)).toBe(true)
  })

  it("refuse la mer Rouge (27.4, 33.67) — cas de l'audit", () => {
    expect(isInFranceMetro(27.4, 33.67)).toBe(false)
  })

  it('refuse les Antilles (16.25, -61.55) et la Réunion (-21.1, 55.5)', () => {
    expect(isInFranceMetro(16.25, -61.55)).toBe(false)
    expect(isInFranceMetro(-21.1, 55.5)).toBe(false)
  })

  it('les bornes de la bbox sont incluses', () => {
    expect(isInFranceMetro(FRANCE_METRO_BBOX.latMin, 0)).toBe(true)
    expect(isInFranceMetro(FRANCE_METRO_BBOX.latMax, 0)).toBe(true)
    expect(isInFranceMetro(45, FRANCE_METRO_BBOX.lngMin)).toBe(true)
    expect(isInFranceMetro(45, FRANCE_METRO_BBOX.lngMax)).toBe(true)
  })

  it('le schéma de création accepte des coords hors bbox (enregistrement flaggé, pas refus)', () => {
    const result = createCatchSchema.safeParse({
      species: 'bar',
      technique: 'leurres',
      latitude: 27.4,
      longitude: 33.67,
    })
    expect(result.success).toBe(true)
  })
})

// ─── Messages zod en français ────────────────────────────────────────────────

describe('messages de validation en français', () => {
  it("espèce invalide → message français", () => {
    const result = createCatchSchema.safeParse({
      species: 'thon',
      technique: 'leurres',
      latitude: 48.0,
      longitude: -4.7,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Choisis une espèce pour continuer')
    }
  })

  it('position manquante en mode gps → messages français', () => {
    const result = createCatchSchema.safeParse({
      species: 'bar',
      technique: 'leurres',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('Indique la latitude (ou choisis un autre mode de localisation).')
      expect(messages).toContain('Indique la longitude (ou choisis un autre mode de localisation).')
    }
  })
})

// ─── Gardes de date + prise mesurée (sprint 53 WS-D / WS-E) ──────────────────

const validCatchBase = {
  species: 'bar',
  technique: 'leurres',
  latitude: 48.0,
  longitude: -4.7,
}

describe('createCatchSchema — garde de date (WS-D)', () => {
  it('refuse une prise dans le futur', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(createCatchSchema.safeParse({ ...validCatchBase, caught_at: future }).success).toBe(false)
  })

  it('accepte une prise dans le passé', () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(createCatchSchema.safeParse({ ...validCatchBase, caught_at: past }).success).toBe(true)
  })
})

describe('createCatchSchema — prise mesurée (WS-E)', () => {
  it('refuse « mesurée » sans longueur ni objet de référence', () => {
    expect(createCatchSchema.safeParse({ ...validCatchBase, is_measured: true }).success).toBe(false)
  })

  it('accepte « mesurée » avec longueur + objet de référence', () => {
    const r = createCatchSchema.safeParse({
      ...validCatchBase,
      is_measured: true,
      measured_length_cm: 42,
      reference_object: 'Black Minnow 120 sur la photo',
    })
    expect(r.success).toBe(true)
  })

  it('ignore la garde mesurée si la case n’est pas cochée', () => {
    expect(createCatchSchema.safeParse({ ...validCatchBase, is_measured: false }).success).toBe(true)
  })
})
