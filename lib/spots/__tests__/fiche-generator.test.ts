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
    // La formulation dit ce que le poste PEUT donner, jamais ce qu'il donne.
    expect(fiche.description).toMatch(/peut donner sur cette façade/)
    expect(fiche.description).toMatch(/pas un relevé de prises/)
    // Et surtout, jamais l'affirmation inverse.
    expect(fiche.description).not.toMatch(/espèces présentes|on y trouve/i)
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

// ── Lisibilité : ce que 2 900 pages ne pardonnent pas ────────────────────────
// Ces trois défauts étaient présents dans la première version et n'avaient PAS
// été attrapés, parce que les tests cherchaient des mensonges et pas des phrases
// mal fichues. Sur un site entier, une tournure bancale répétée 2 900 fois est
// le signal le plus clair possible que le contenu est fabriqué.
describe('lisibilité du français produit', () => {
  const echantillons = [
    generateFiche(penvins)!,
    generateFiche(marseille)!,
    generateFiche({ ...penvins, structure: 'cale' })!,
    generateFiche({ ...marseille, structure: 'digue' })!,
    generateFiche({ ...penvins, structure: 'passe' })!,
    generateFiche({ ...marseille, structure: 'estuaire' })!,
  ]

  it('aucune préposition doublée (« à au », « à à », « de de »)', () => {
    for (const f of echantillons) {
      expect(f.description).not.toMatch(/\b(à à|à au|à aux|de de|du du|de le\b)/)
    }
  })

  it('ne répète pas le département juste après lui-même', () => {
    // « dans les Bouches-du-Rhône (Bouches-du-Rhône) » : le défaut d'origine.
    for (const f of echantillons) {
      expect(f.description).not.toMatch(/(\b[A-ZÀ-Ý][\wÀ-ÿ'’-]+(?:-[\wÀ-ÿ'’]+)*)\s*\(\1\)/)
    }
  })

  it('n’enchaîne pas deux espaces ni un espace avant une ponctuation simple', () => {
    for (const f of echantillons) {
      expect(f.description).not.toMatch(/ {2}/)
      expect(f.description).not.toMatch(/\s[,.]/)
    }
  })

  it('liste les espèces au nominatif, jamais avec une préposition collée', () => {
    for (const f of echantillons) {
      expect(f.description).toMatch(/Espèces que ce type de poste peut donner sur cette façade : /)
    }
  })
})

// ★ Ce test aurait évité de publier 200 fiches affichant « courant_fort » brut.
describe('les clés produites existent dans les référentiels d’affichage', () => {
  it('tous les dangers ont un libellé', async () => {
    const { HAZARDS_LABELS, TECHNIQUE_LABELS, SPECIES_LABELS } = await import('@/lib/labels')
    const posts = ['plage', 'pointe_rocheuse', 'cale', 'digue', 'passe', 'estuaire'] as const
    for (const p of posts) {
      for (const dept of ['56 ', '13 ']) {
        const f = generateFiche({ name: 'X', department: dept, structure: p, lat: 45, lng: 0 })!
        for (const h of f.hazards) expect(HAZARDS_LABELS[h], `danger « ${h} »`).toBeDefined()
        for (const t of f.techniques) expect(TECHNIQUE_LABELS[t], `technique « ${t} »`).toBeDefined()
        for (const sp of f.species) expect(SPECIES_LABELS[sp], `espèce « ${sp} »`).toBeDefined()
      }
    }
  })
})

// ★ Défaut réel du lot 1 : « Accès plage » et « Mise à l'eau » avaient été publiés.
describe('un nom d’étiquette OSM n’est pas un nom de spot', () => {
  it('REFUSE les libellés génériques', () => {
    for (const nom of ['Accès plage', 'Acces Plage', "Mise à l'eau", "mise à l'eau plaisance", 'Plage', 'Cale', 'Port']) {
      const r = qualityGate({ ...marseille, name: nom })
      expect(r.pass, nom).toBe(false)
      if (!r.pass) expect(r.reasons).toContain('nom_generique')
    }
  })

  it('ACCEPTE un nom qualifié, même s’il commence par un mot générique', () => {
    for (const nom of ["Mise à l'Eau du Vidourle", 'Plage des Catalans', 'Port de Sanary']) {
      expect(qualityGate({ ...marseille, name: nom }).pass, nom).toBe(true)
    }
  })
})
