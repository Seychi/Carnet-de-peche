import { describe, it, expect } from 'vitest'
import { isDeclarable, getDeclarableInfo, DECLARABLE_DB_KEYS } from '../recfishing'

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
