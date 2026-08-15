import { describe, it, expect } from 'vitest'
import {
  generateFiche,
  qualityGate,
  hasPlausibleCoords,
  isKnownStructure,
  MIN_DESCRIPTION_LENGTH,
  type PendingSpotInput,
} from '@/lib/spots/fiche-generator'

const penvins: PendingSpotInput = {
  name: 'Pointe de Penvins',
  department: '56 ',
  structure: 'pointe_rocheuse',
  lat: 47.5,
  lng: -2.7,
}
const marseille: PendingSpotInput = {
  name: 'Plage des Catalans',
  department: '13 ',
  structure: 'plage',
  lat: 43.29,
  lng: 5.35,
}

describe('porte de qualité — rien ne se publie sans elle', () => {
  it('laisse passer un poste complet', () => {
    const r = qualityGate(penvins)
    expect(r.pass).toBe(true)
  })

  it('REFUSE un spot sans type de poste (1 113 des 4 018 sont dans ce cas)', () => {
    const r = qualityGate({ ...penvins, structure: null })
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.reasons).toContain('poste_non_identifie')
  })

  it('REFUSE des coordonnées hors de la métropole ou nulles', () => {
    for (const coords of [{ lat: 0, lng: 0 }, { lat: 60, lng: 2 }, { lat: 45, lng: -30 }]) {
      const r = qualityGate({ ...penvins, ...coords })
      expect(r.pass).toBe(false)
      if (!r.pass) expect(r.reasons).toContain('coordonnees_invalides')
    }
  })

  it('REFUSE un doublon à moins de 150 m d’un spot déjà approuvé', () => {
    const r = qualityGate(penvins, { hasDuplicateWithin150m: true })
    expect(r.pass).toBe(false)
    if (!r.pass) expect(r.reasons).toContain('doublon_150m')
  })

  it('exige une description d’au moins 400 caractères', () => {
    const fiche = generateFiche(penvins)!
    expect(fiche.description.length).toBeGreaterThanOrEqual(MIN_DESCRIPTION_LENGTH)
  })

  it('exige au moins 2 espèces plausibles', () => {
    const fiche = generateFiche(penvins)!
    expect(fiche.species.length).toBeGreaterThanOrEqual(2)
  })
})

describe('honnêteté du texte — l’invariant du bloc', () => {
  const fiche = generateFiche(penvins)!

  it('n’affirme JAMAIS qu’une prise a eu lieu', () => {
    expect(fiche.description).not.toMatch(/on y prend|a été pris|prises déclarées ici :/i)
    // Au contraire, il dit explicitement le contraire.
    expect(fiche.description).toMatch(/aucune prise n’a encore été déclarée ici/i)
  })

  it('qualifie les espèces comme PLAUSIBLES, pas comme présentes', () => {
    expect(fiche.description).toMatch(/se prête à/)
    expect(fiche.description).toMatch(/pas un relevé de prises/)
  })

  it('n’emploie pas de tiret cadratin (CLAUDE.md §6)', () => {
    for (const t of [fiche.description, fiche.accessNotes]) expect(t).not.toMatch(/—/)
  })
})

describe('la fiche est propre au spot, pas un gabarit interchangeable', () => {
  it('deux spots différents produisent deux descriptions différentes', () => {
    const a = generateFiche(penvins)!.description
    const b = generateFiche(marseille)!.description
    expect(a).not.toBe(b)
  })

  it('la description nomme le spot et son département', () => {
    const f = generateFiche(penvins)!
    expect(f.description).toContain('Pointe de Penvins')
    expect(f.description).toContain('Morbihan')
  })

  it('deux spots de MÊME type et MÊME département restent distingués par leur nom', () => {
    const autre = generateFiche({ ...penvins, name: 'Pointe du Grand Mont' })!
    expect(autre.description).not.toBe(generateFiche(penvins)!.description)
    expect(autre.description).toContain('Pointe du Grand Mont')
  })
})

// ── Le garde-fou du Bloc 3 : ne pas servir un gabarit atlantique en Méditerranée.
describe('Méditerranée — le marnage n’y commande pas', () => {
  const med = generateFiche(marseille)!

  it('ne met AUCUN argument de marée en avant sur la façade méditerranéenne', () => {
    expect(med.description).toMatch(/marnage est négligeable/)
    expect(med.description).not.toMatch(/coefficient/)
  })

  it('parle de ce qui compte vraiment là-bas', () => {
    expect(med.description).toMatch(/vent/)
    expect(med.description).toMatch(/houle|état de la mer/)
  })

  it('propose des espèces méditerranéennes, pas du lieu jaune', () => {
    expect(med.species).not.toContain('lieu_jaune')
    expect(med.species.some((s) => ['sar', 'oblade', 'marbre', 'dorade_royale'].includes(s))).toBe(true)
  })

  it('à l’inverse, l’Atlantique garde son discours de marée', () => {
    const atl = generateFiche(penvins)!
    expect(atl.description).toMatch(/marnage est fort/)
    expect(atl.species).toContain('lieu_jaune')
  })
})

describe('helpers', () => {
  it('isKnownStructure ne reconnaît que les postes réellement gérés', () => {
    expect(isKnownStructure('plage')).toBe(true)
    expect(isKnownStructure('port_de_plaisance')).toBe(false)
    expect(isKnownStructure(null)).toBe(false)
  })

  it('hasPlausibleCoords borne la métropole, Corse comprise', () => {
    expect(hasPlausibleCoords(41.9, 8.7)).toBe(true) // Ajaccio
    expect(hasPlausibleCoords(50.9, 1.85)).toBe(true) // Calais
    expect(hasPlausibleCoords(48.85, 2.35)).toBe(true) // Paris (hors mer, mais la porte marée tranchera)
    expect(hasPlausibleCoords(NaN, 2)).toBe(false)
  })
})
