import { describe, it, expect } from 'vitest'
import { RANKS, levelFromXp, levelProgress } from '../levels'

describe('RANKS (table de paliers)', () => {
  it('démarre à 0 XP (Mousse) et est strictement croissante', () => {
    expect(RANKS[0]).toMatchObject({ level: 1, name: 'Mousse', minXp: 0 })
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minXp).toBeGreaterThan(RANKS[i - 1].minXp)
      expect(RANKS[i].level).toBe(RANKS[i - 1].level + 1)
    }
  })
})

describe('levelFromXp', () => {
  it('0 XP → Mousse (premier palier), progression vers 100', () => {
    const l = levelFromXp(0)
    expect(l.rankName).toBe('Mousse')
    expect(l.level).toBe(1)
    expect(l.currentThreshold).toBe(0)
    expect(l.nextThreshold).toBe(100)
    expect(l.xpIntoLevel).toBe(0)
    expect(l.xpForNextLevel).toBe(100)
  })

  it('juste SOUS un seuil reste au rang courant', () => {
    const l = levelFromXp(99)
    expect(l.rankName).toBe('Mousse')
    expect(l.xpIntoLevel).toBe(99)
    expect(l.xpForNextLevel).toBe(100)
  })

  it('exactement AU seuil bascule au rang suivant', () => {
    const l = levelFromXp(100)
    expect(l.rankName).toBe('Pêcheur du dimanche')
    expect(l.level).toBe(2)
    expect(l.currentThreshold).toBe(100)
    expect(l.nextThreshold).toBe(300)
    expect(l.xpIntoLevel).toBe(0)
  })

  it('1500 XP → Fine gaule (repère de l\'audit)', () => {
    const l = levelFromXp(1500)
    expect(l.rankName).toBe('Fine gaule')
    expect(l.level).toBe(5)
    expect(l.currentThreshold).toBe(1500)
    expect(l.nextThreshold).toBe(3000)
  })

  it('milieu de palier : XP dans le niveau bien calculée', () => {
    const l = levelFromXp(1840) // exemple maquette audit (Fine gaule)
    expect(l.rankName).toBe('Fine gaule')
    expect(l.xpIntoLevel).toBe(340) // 1840 - 1500
    expect(l.xpForNextLevel).toBe(1500) // 3000 - 1500
  })

  it('dernier palier : pas de « next » (null géré proprement)', () => {
    const l = levelFromXp(15000)
    expect(l.rankName).toBe('Légende locale')
    expect(l.level).toBe(RANKS.length)
    expect(l.nextThreshold).toBeNull()
    expect(l.xpForNextLevel).toBeNull()
    expect(l.xpIntoLevel).toBe(0)
  })

  it('au-delà du dernier palier : reste au dernier rang, barre pleine', () => {
    const l = levelFromXp(999_999)
    expect(l.rankName).toBe('Légende locale')
    expect(l.nextThreshold).toBeNull()
    expect(levelProgress(l)).toBe(1)
  })

  it('entrée négative / non finie : traitée comme 0 (défensif)', () => {
    expect(levelFromXp(-50).rankName).toBe('Mousse')
    expect(levelFromXp(Number.NaN).rankName).toBe('Mousse')
    expect(levelFromXp(-50).xpIntoLevel).toBe(0)
  })

  it('XP fractionnaire : plancher appliqué', () => {
    const l = levelFromXp(150.9)
    expect(l.rankName).toBe('Pêcheur du dimanche')
    expect(l.xpIntoLevel).toBe(50) // floor(150.9) - 100
  })
})

describe('levelProgress', () => {
  it('renvoie une fraction 0..1 dans le niveau courant', () => {
    expect(levelProgress(levelFromXp(0))).toBe(0)
    expect(levelProgress(levelFromXp(50))).toBeCloseTo(0.5, 5) // 50/100
    expect(levelProgress(levelFromXp(15000))).toBe(1) // dernier palier
  })
})
