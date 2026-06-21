import { describe, it, expect } from 'vitest'
import { computeInsights } from './insights'

// Été (Paris = UTC+2) : 12:00Z → 14h Paris (jour) ; 01:00Z → 03h Paris (nuit).
function dayCatch(size: number, day = 15): { size_cm: number; caught_at: string } {
  return { size_cm: size, caught_at: `2026-07-${String(day).padStart(2, '0')}T12:00:00Z` }
}
function nightCatch(size: number, day = 15): { size_cm: number; caught_at: string } {
  return { size_cm: size, caught_at: `2026-07-${String(day).padStart(2, '0')}T01:00:00Z` }
}

describe('computeInsights — jour/nuit', () => {
  it('détecte des prises de jour plus grosses, % exact', () => {
    const catches = [
      ...[50, 52, 48, 51, 49].map((s, i) => dayCatch(s, 10 + i)),
      ...[40, 42, 38, 41, 39].map((s, i) => nightCatch(s, 10 + i)),
    ]
    const { insights } = computeInsights(catches)
    const dn = insights.find((i) => i.id === 'daynight-size')
    expect(dn).toBeDefined()
    // ⌀ jour 50, ⌀ nuit 40 → +25%
    expect(dn!.text).toContain('+25%')
    expect(dn!.text).toContain('journée')
  })

  it("n'affiche rien si l'échantillon est trop faible", () => {
    const catches = [dayCatch(50), dayCatch(52), nightCatch(40)]
    const { insights } = computeInsights(catches)
    expect(insights.find((i) => i.id === 'daynight-size')).toBeUndefined()
  })

  it('ignore le delta sous le seuil de 5%', () => {
    const catches = [
      ...[50, 50, 50, 50].map((s) => dayCatch(s)),
      ...[49, 49, 49, 49].map((s) => nightCatch(s)), // 2% < 5%
    ]
    const { insights } = computeInsights(catches)
    expect(insights.find((i) => i.id === 'daynight-size')).toBeUndefined()
  })
})

describe('computeInsights — meilleur mois', () => {
  it('repère le mois le plus prolifique au-dessus du seuil', () => {
    const catches = Array.from({ length: 9 }, (_, i) => dayCatch(45, (i % 20) + 1))
    const { insights } = computeInsights(catches)
    const bm = insights.find((i) => i.id === 'best-month')
    expect(bm).toBeDefined()
    expect(bm!.text.toLowerCase()).toContain('juillet')
  })

  it('reste muet sous le seuil de prises', () => {
    const catches = Array.from({ length: 5 }, () => dayCatch(45))
    const { insights } = computeInsights(catches)
    expect(insights.find((i) => i.id === 'best-month')).toBeUndefined()
  })
})
