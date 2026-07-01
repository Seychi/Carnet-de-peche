import { describe, it, expect } from 'vitest'
import { nextSizeMilestone, milestoneProgress } from '../size-milestones'

describe('nextSizeMilestone', () => {
  it('renvoie le prochain multiple rond au-dessus du record (grosse espèce, pas 10)', () => {
    // bar : pas par défaut = 10 cm au-delà de 50 cm
    expect(nextSizeMilestone('bar', 55)).toBe(60)
    expect(nextSizeMilestone('bar', 72)).toBe(80)
  })

  it('avance au jalon suivant quand le record est PILE sur un jalon', () => {
    expect(nextSizeMilestone('bar', 60)).toBe(70)
  })

  it('utilise un pas fin (5 cm) pour les petites espèces', () => {
    expect(nextSizeMilestone('maquereau', 38)).toBe(40)
    expect(nextSizeMilestone('maquereau', 40)).toBe(45)
    expect(nextSizeMilestone('sar', 41)).toBe(45)
  })

  it('utilise un pas large (20 cm) pour les très grosses espèces', () => {
    expect(nextSizeMilestone('congre', 130)).toBe(140)
    expect(nextSizeMilestone('maigre', 90)).toBe(100)
  })

  it('adapte le pas par défaut à l’échelle pour une espèce inconnue', () => {
    // < 50 cm → pas de 5 ; ≥ 50 cm → pas de 10
    expect(nextSizeMilestone('espece_inconnue', 42)).toBe(45)
    expect(nextSizeMilestone('espece_inconnue', 72)).toBe(80)
  })

  it('renvoie null pour une taille invalide', () => {
    expect(nextSizeMilestone('bar', 0)).toBeNull()
    expect(nextSizeMilestone('bar', -10)).toBeNull()
    expect(nextSizeMilestone('bar', Number.NaN)).toBeNull()
  })
})

describe('milestoneProgress', () => {
  it('remplit la barre à record / prochain jalon', () => {
    const p = milestoneProgress('bar', 55)
    expect(p).not.toBeNull()
    expect(p!.next).toBe(60)
    expect(p!.ratio).toBeCloseTo(55 / 60, 5)
  })

  it('borne le ratio à 1 au maximum', () => {
    const p = milestoneProgress('bar', 55)
    expect(p!.ratio).toBeLessThanOrEqual(1)
    expect(p!.ratio).toBeGreaterThan(0)
  })

  it('renvoie null pour une taille invalide', () => {
    expect(milestoneProgress('bar', 0)).toBeNull()
    expect(milestoneProgress('bar', Number.NaN)).toBeNull()
  })
})
