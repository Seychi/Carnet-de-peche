import { describe, it, expect } from 'vitest'
import { isDeclarable, getDeclarableInfo, DECLARABLE_DB_KEYS, getMarineParkNotice } from '../recfishing'

describe('RecFishing : espèces sensibles déclarables', () => {
  it('bar/lieu jaune/maquereau déclarables en Manche/Atlantique', () => {
    expect(isDeclarable('bar', 'manche-atlantique')).toBe(true)
    expect(isDeclarable('lieu_jaune', 'manche-atlantique')).toBe(true)
    expect(isDeclarable('maquereau', 'manche-atlantique')).toBe(true)
  })

  it('aucune de nos espèces loggables n’est déclarable en Méditerranée (dorade rose/coryphène hors carnet)', () => {
    expect(isDeclarable('bar', 'mediterranee')).toBe(false)
    expect(isDeclarable('maquereau', 'mediterranee')).toBe(false)
    expect(isDeclarable('lieu_jaune', 'mediterranee')).toBe(false)
  })

  it('espèces non sensibles : jamais de déclaration', () => {
    expect(isDeclarable('sar', 'manche-atlantique')).toBe(false)
    expect(isDeclarable('dorade_royale', 'manche-atlantique')).toBe(false)
    expect(isDeclarable('orphie', 'manche-atlantique')).toBe(false)
    expect(isDeclarable('seiche', 'mediterranee')).toBe(false)
  })

  it('accepte la clé DB underscore comme le slug kebab', () => {
    expect(isDeclarable('lieu_jaune', 'manche-atlantique')).toBe(true)
    expect(isDeclarable('lieu-jaune', 'manche-atlantique')).toBe(true)
  })

  it('getDeclarableInfo renvoie le nom commun officiel (pour le récap)', () => {
    expect(getDeclarableInfo('bar', 'manche-atlantique')?.commonFr).toMatch(/bar/i)
    expect(getDeclarableInfo('bar', 'mediterranee')).toBeNull()
  })

  it('le thon rouge n’est PAS dans la liste (retiré le 01/04/2026)', () => {
    const allLatin = DECLARABLE_DB_KEYS.join(',')
    // nos clés loggables sensibles = bar, lieu_jaune, maquereau (pas de thon)
    expect(DECLARABLE_DB_KEYS.sort()).toEqual(['bar', 'lieu_jaune', 'maquereau'])
    expect(allLatin).not.toMatch(/thon/i)
  })

  it('espèce inconnue → non déclarable, jamais d’erreur', () => {
    expect(isDeclarable('poisson_lune', 'manche-atlantique')).toBe(false)
    expect(isDeclarable(null, 'mediterranee')).toBe(false)
  })
})

describe('getMarineParkNotice : gaté par département (exact, pas « tout Med »)', () => {
  it('Golfe du Lion (Aude 11, Pyrénées-Orientales 66) → mentionne bar 42 cm + CatchMachine', () => {
    expect(getMarineParkNotice('11')).toMatch(/Golfe du Lion/)
    expect(getMarineParkNotice('11')).toMatch(/42 cm/)
    expect(getMarineParkNotice('66')).toMatch(/CatchMachine/)
  })
  it('Calanques (13) et Cap Corse (2B) → CatchMachine sans maille bar 42', () => {
    expect(getMarineParkNotice('13')).toMatch(/Calanques/)
    expect(getMarineParkNotice('2B')).toMatch(/Cap Corse/)
    expect(getMarineParkNotice('13')).not.toMatch(/42 cm/)
  })
  it('autres départements Med (Var 83, Corse-du-Sud 2A, Nice 06) → aucune note (null)', () => {
    expect(getMarineParkNotice('83')).toBeNull()
    expect(getMarineParkNotice('2A')).toBeNull()
    expect(getMarineParkNotice('06')).toBeNull()
  })
  it('Atlantique/Manche et valeurs vides → null', () => {
    expect(getMarineParkNotice('29')).toBeNull()
    expect(getMarineParkNotice(null)).toBeNull()
    expect(getMarineParkNotice(undefined)).toBeNull()
  })
})
