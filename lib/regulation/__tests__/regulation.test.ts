import { describe, it, expect } from 'vitest'
import {
  getMinSize,
  checkSize,
  isMarquageRequired,
  getDailyQuota,
  getClosedWindows,
  isClosedSeason,
  resolveSpeciesSlug,
  getFacadeForCatch,
  facadeFromLatLng,
} from '..'
import { SPECIES_REGULATION } from '../data'
import { ESPECES_CONTENT } from '@/lib/especes/content'
import { SPECIES_SLUGS } from '@/lib/seo/programmatic'

// ─── Anti-dérive : data.ts (moteur) === fiches (source affichée) ──────────────
// Garantit qu'on ne réintroduit JAMAIS deux sources de vérité contradictoires sur
// la maille (le bug `bar: 36` du sprint 24). La maille du moteur DOIT être la copie
// exacte de la fiche, façade par façade.
describe('cohérence réglementation : data.ts === fiches espèces', () => {
  it.each(SPECIES_SLUGS)('%s : minSizeCm + marquage identiques à la fiche', (slug) => {
    const reg = SPECIES_REGULATION[slug]
    const fiche = ESPECES_CONTENT[slug].regulation
    expect(reg, `SPECIES_REGULATION manque ${slug}`).toBeDefined()
    expect(reg.minSizeCm).toEqual(fiche.minSizeCm)
    expect(reg.marquage).toBe(fiche.marquage)
  })

  it('couvre exactement les espèces du référentiel (26 au sprint 29)', () => {
    expect(Object.keys(SPECIES_REGULATION).sort()).toEqual([...SPECIES_SLUGS].sort())
  })
})

// ─── Maille façade-aware : 6 espèces cœur × 2 façades ─────────────────────────
describe('getMinSize : façade-aware', () => {
  it('bar = 42 cm Manche/Atlantique, 30 cm Méditerranée', () => {
    expect(getMinSize('bar', 'manche-atlantique')).toBe(42)
    expect(getMinSize('bar', 'mediterranee')).toBe(30)
  })
  it('dorade royale = 23 cm sur les deux façades', () => {
    expect(getMinSize('dorade_royale', 'manche-atlantique')).toBe(23)
    expect(getMinSize('dorade_royale', 'mediterranee')).toBe(23)
  })
  it('lieu jaune = 42 cm Manche/Atlantique, absent (null) en Méditerranée', () => {
    expect(getMinSize('lieu_jaune', 'manche-atlantique')).toBe(42)
    expect(getMinSize('lieu_jaune', 'mediterranee')).toBeNull()
  })
  it('maquereau = 20 cm Manche/Atlantique, 18 cm Méditerranée', () => {
    expect(getMinSize('maquereau', 'manche-atlantique')).toBe(20)
    expect(getMinSize('maquereau', 'mediterranee')).toBe(18)
  })
  it('sar = 25 cm Manche/Atlantique, 23 cm Méditerranée', () => {
    expect(getMinSize('sar', 'manche-atlantique')).toBe(25)
    expect(getMinSize('sar', 'mediterranee')).toBe(23)
  })
  it('orphie = 30 cm Manche/Atlantique, pas de maille (null) en Méditerranée', () => {
    expect(getMinSize('orphie', 'manche-atlantique')).toBe(30)
    expect(getMinSize('orphie', 'mediterranee')).toBeNull()
  })
})

// ─── Non-régression du bug `bar: 36` (le cœur du sprint) ──────────────────────
// ⚠️ Le brief annonçait « un bar 38 cm Manche n'est PLUS sous-taille » : c'est INEXACT.
// La maille Manche/Atlantique est 42 cm → un bar de 38 cm EST sous-taille. Le vieux
// `bar: 36` (façade-aveugle) était SOUS-protecteur en Manche (laissait passer 36-41 cm)
// ET flaguait à tort un bar de 30 cm LÉGAL en Méditerranée. Le fix corrige les deux.
describe('checkSize : correction du bug façade-aveugle', () => {
  it('bar 38 cm en Manche = SOUS-TAILLE (maille 42, l’ancien 36 le laissait passer à tort)', () => {
    expect(checkSize('bar', 'manche-atlantique', 38)).toEqual({ status: 'undersize', minSizeCm: 42 })
  })
  it('bar 30 cm en Méditerranée = LÉGAL (maille 30 ; l’ancien 36 le relâchait à tort)', () => {
    expect(checkSize('bar', 'mediterranee', 30)).toEqual({ status: 'legal', minSizeCm: 30 })
  })
  it('bar 45 cm en Manche = légal', () => {
    expect(checkSize('bar', 'manche-atlantique', 45)).toEqual({ status: 'legal', minSizeCm: 42 })
  })
  it('espèce sans maille (calmar) = no-min, jamais de faux verdict', () => {
    expect(checkSize('calmar', 'manche-atlantique', 5)).toEqual({ status: 'no-min', minSizeCm: null })
  })
  it('espèce inconnue = unknown, aucun verdict', () => {
    expect(checkSize('dragon_des_mers', 'manche-atlantique', 40)).toEqual({ status: 'unknown', minSizeCm: null })
  })
})

// ─── Pont slug prise (snake) ↔ fiche (kebab) ──────────────────────────────────
describe('resolveSpeciesSlug : mismatch underscore/tiret', () => {
  it('accepte la clé DB underscore', () => {
    expect(resolveSpeciesSlug('dorade_royale')).toBe('dorade-royale')
    expect(resolveSpeciesSlug('lieu_jaune')).toBe('lieu-jaune')
    expect(resolveSpeciesSlug('dorade_grise')).toBe('dorade-grise')
  })
  it('accepte directement le slug kebab', () => {
    expect(resolveSpeciesSlug('dorade-royale')).toBe('dorade-royale')
    expect(resolveSpeciesSlug('bar')).toBe('bar')
  })
  it('null pour une espèce inconnue ou vide', () => {
    expect(resolveSpeciesSlug('inconnu')).toBeNull()
    expect(resolveSpeciesSlug(null)).toBeNull()
    expect(resolveSpeciesSlug(undefined)).toBeNull()
  })
  it('getMinSize fonctionne via la clé DB underscore', () => {
    expect(getMinSize('dorade_royale', 'mediterranee')).toBe(23)
  })
})

// ─── Façade d'une prise ───────────────────────────────────────────────────────
describe('getFacadeForCatch : département prioritaire, géoloc en repli, null si rien', () => {
  it('département Méditerranée → mediterranee', () => {
    expect(getFacadeForCatch({ department: '13' })).toBe('mediterranee')
    expect(getFacadeForCatch({ department: '2A' })).toBe('mediterranee')
    expect(getFacadeForCatch({ department: '66' })).toBe('mediterranee')
  })
  it('département Manche/Atlantique → manche-atlantique', () => {
    expect(getFacadeForCatch({ department: '29' })).toBe('manche-atlantique')
    expect(getFacadeForCatch({ department: '62' })).toBe('manche-atlantique')
  })
  it('repli géoloc quand pas de département', () => {
    expect(getFacadeForCatch({ lat: 43.29, lng: 5.37 })).toBe('mediterranee') // Marseille
    expect(getFacadeForCatch({ lat: 41.92, lng: 8.74 })).toBe('mediterranee') // Ajaccio
    expect(getFacadeForCatch({ lat: 48.39, lng: -4.49 })).toBe('manche-atlantique') // Brest
    expect(getFacadeForCatch({ lat: 51.03, lng: 2.37 })).toBe('manche-atlantique') // Dunkerque
  })
  it('façade INCONNUE (null) si ni département ni géoloc', () => {
    expect(getFacadeForCatch({})).toBeNull()
    expect(getFacadeForCatch({ department: null, lat: null, lng: null })).toBeNull()
  })
})

describe('facadeFromLatLng : classifieur grossier mais sans collision', () => {
  it('arc méditerranéen continental', () => {
    expect(facadeFromLatLng(42.45, 3.17)).toBe('mediterranee') // Cerbère
    expect(facadeFromLatLng(43.69, 7.27)).toBe('mediterranee') // Nice
  })
  it('Corse', () => {
    expect(facadeFromLatLng(42.7, 9.45)).toBe('mediterranee') // Bastia
  })
  it('Manche / Atlantique', () => {
    expect(facadeFromLatLng(46.16, -1.15)).toBe('manche-atlantique') // La Rochelle
    expect(facadeFromLatLng(48.64, -2.01)).toBe('manche-atlantique') // Saint-Malo
  })
})

// ─── Marquage ─────────────────────────────────────────────────────────────────
describe('isMarquageRequired', () => {
  it('bar et maquereau = marquage obligatoire', () => {
    expect(isMarquageRequired('bar')).toBe(true)
    expect(isMarquageRequired('maquereau')).toBe(true)
  })
  it('orphie et calmar = pas de marquage', () => {
    expect(isMarquageRequired('orphie')).toBe(false)
    expect(isMarquageRequired('calmar')).toBe(false)
  })
})

// ─── Quotas journaliers ───────────────────────────────────────────────────────
describe('getDailyQuota', () => {
  it('bar : deux règles (nord/sud 48e) en Manche/Atlantique', () => {
    const q = getDailyQuota('bar', 'manche-atlantique')
    expect(q).toHaveLength(2)
    expect(q.map((r) => r.perDay).sort()).toEqual([2, 3])
  })
  it('bar : aucune règle de quota chiffrée en Méditerranée', () => {
    expect(getDailyQuota('bar', 'mediterranee')).toEqual([])
  })
  it('maquereau : 10/jour en Manche/Atlantique, rien en Méditerranée', () => {
    expect(getDailyQuota('maquereau', 'manche-atlantique')[0]?.perDay).toBe(10)
    expect(getDailyQuota('maquereau', 'mediterranee')).toEqual([])
  })
  it('sar : aucun quota (honnête)', () => {
    expect(getDailyQuota('sar', 'manche-atlantique')).toEqual([])
  })
})

// ─── Fenêtres de fermeture ────────────────────────────────────────────────────
describe('isClosedSeason / getClosedWindows', () => {
  it('lieu jaune : fermeture totale janvier-avril (façade-large)', () => {
    const jan = isClosedSeason('lieu_jaune', 'manche-atlantique', new Date('2026-01-15T10:00:00Z'))
    expect(jan.active).toHaveLength(1)
    expect(jan.strictlyClosed).toBe(true)
    const jun = isClosedSeason('lieu_jaune', 'manche-atlantique', new Date('2026-06-15T10:00:00Z'))
    expect(jun.active).toHaveLength(0)
    expect(jun.strictlyClosed).toBe(false)
  })
  it('bar : no-take février-mars zoné (48e) → fenêtre active mais pas strictlyClosed (zone requise)', () => {
    const feb = isClosedSeason('bar', 'manche-atlantique', new Date('2026-02-15T10:00:00Z'))
    expect(feb.active).toHaveLength(1)
    // zonée (48e parallèle) → on ne ferme pas « dur » sans la position fine
    expect(feb.strictlyClosed).toBe(false)
  })
  it('bar : aucune fermeture en Méditerranée', () => {
    expect(getClosedWindows('bar', 'mediterranee')).toEqual([])
  })
})
