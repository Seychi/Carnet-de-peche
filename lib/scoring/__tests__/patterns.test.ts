import { describe, it, expect } from 'vitest'
import { computeCatchPatterns } from '../patterns'
import type { CatchSample } from '../types'

function sample(over: Partial<CatchSample>): CatchSample {
  return {
    caughtAt: new Date('2026-05-10T08:00:00Z'),
    lengthCm: 40,
    windSpeedKmh: null,
    windDirectionDeg: null,
    tideState: 'unknown',
    hourLocal: 9,   // morning
    monthLocal: 5,  // spring
    ...over,
  }
}

describe('computeCatchPatterns', () => {
  it('retourne toujours les 4 facteurs', () => {
    const patterns = computeCatchPatterns([sample({})])
    expect(patterns.map((p) => p.factor)).toEqual(['wind', 'tide', 'hour', 'season'])
  })

  it('marque hasData=false quand le vent n’est jamais renseigné', () => {
    const patterns = computeCatchPatterns([sample({}), sample({})])
    const wind = patterns.find((p) => p.factor === 'wind')!
    expect(wind.hasData).toBe(false)
    expect(wind.dominantLabel).toBeNull()
    expect(wind.total).toBe(0)
  })

  it('n’inclut pas les prises sans vent dans le total vent (pas de piège null=calme)', () => {
    const patterns = computeCatchPatterns([
      sample({ windSpeedKmh: 10 }), // light
      sample({ windSpeedKmh: 12 }), // light
      sample({ windSpeedKmh: null }),
    ])
    const wind = patterns.find((p) => p.factor === 'wind')!
    expect(wind.hasData).toBe(true)
    expect(wind.total).toBe(2)
    expect(wind.count).toBe(2)
    expect(wind.dominantLabel).toContain('Léger')
  })

  it('exclut les marées inconnues', () => {
    const patterns = computeCatchPatterns([
      sample({ tideState: 'rising' }),
      sample({ tideState: 'rising' }),
      sample({ tideState: 'unknown' }),
    ])
    const tide = patterns.find((p) => p.factor === 'tide')!
    expect(tide.total).toBe(2)
    expect(tide.count).toBe(2)
    expect(tide.dominantLabel).toBe('Marée montante')
  })

  it('identifie l’heure dominante', () => {
    const patterns = computeCatchPatterns([
      sample({ hourLocal: 5 }),  // dawn
      sample({ hourLocal: 5 }),  // dawn
      sample({ hourLocal: 13 }), // midday
    ])
    const hour = patterns.find((p) => p.factor === 'hour')!
    expect(hour.hasData).toBe(true)
    expect(hour.count).toBe(2)
    expect(hour.total).toBe(3)
  })

  it('saison toujours disponible et dérivée du mois', () => {
    const patterns = computeCatchPatterns([sample({ monthLocal: 7 })]) // summer
    const season = patterns.find((p) => p.factor === 'season')!
    expect(season.hasData).toBe(true)
    expect(season.dominantLabel).toBe('En été')
  })
})
