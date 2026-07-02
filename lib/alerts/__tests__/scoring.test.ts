import { describe, it, expect } from 'vitest'
import { toCatchSamples, type DbCatchRow } from '@/lib/scoring/personal/buckets'
import { computePersonalTendencies } from '@/lib/scoring/personal/tendencies'
import type { TidePoint } from '@/lib/conditions/spot-forecast'
import {
  computeWindowOverlay,
  tideDirectionForWindow,
  summarizeTendencies,
  MIN_MATCHED_FACTORS,
} from '../scoring'

// ─── Fixtures S22 (mêmes conventions que window-match.test) ─────────────────────
// 4 bars le matin (09:00 Paris, été), marée descendante, vent 8 km/h (« léger »).
function morningBar(extra: Partial<DbCatchRow> = {}): DbCatchRow {
  return {
    species: 'bar',
    spot_id: 'spot-A',
    caught_at: '2026-06-15T07:00:00Z', // 09:00 Europe/Paris (CEST) → « le matin »
    wind_speed_kmh: 8,
    tide_state: 'falling',
    conditions: null,
    ...extra,
  }
}

const richTendencies = () =>
  computePersonalTendencies(toCatchSamples([morningBar(), morningBar(), morningBar(), morningBar()]))

const poorTendencies = () => computePersonalTendencies(toCatchSamples([morningBar()]))

// Fenêtre du lendemain matin : 09:00-11:00 Paris (07:00Z-09:00Z, été).
const morningWindow = { startTimeISO: '2026-07-03T07:00:00Z', endTimeISO: '2026-07-03T09:00:00Z' }
// Fenêtre du soir : 21:00-23:00 Paris.
const eveningWindow = { startTimeISO: '2026-07-03T19:00:00Z', endTimeISO: '2026-07-03T21:00:00Z' }

describe('summarizeTendencies — résumé du contrat', () => {
  it('reflète hasEnough / sampleCount / confidence', () => {
    const rich = summarizeTendencies(richTendencies())
    expect(rich).toEqual({ hasEnough: true, sampleCount: 4, confidence: 'low' })
    const poor = summarizeTendencies(poorTendencies())
    expect(poor.hasEnough).toBe(false)
    expect(poor.sampleCount).toBe(1)
  })
})

describe('tideDirectionForWindow — même logique que scoreTide, direction exposée', () => {
  // Fenêtre 06:00-08:00 Paris (04:00Z-06:00Z, été) → heures locales 6 à 8.
  const startISO = '2026-07-03T04:00:00Z'
  const endISO = '2026-07-03T06:00:00Z'

  it('détecte la montante (delta positif au-dessus du seuil d’étale)', () => {
    const points: TidePoint[] = [
      { hour: 0, height_m: 0.5 },
      { hour: 6, height_m: 1.0 },
      { hour: 7, height_m: 1.6 },
      { hour: 8, height_m: 2.2 },
      { hour: 12, height_m: 4.0 },
    ]
    expect(tideDirectionForWindow(startISO, endISO, points)).toBe('rising')
  })

  it('détecte la descendante', () => {
    const points: TidePoint[] = [
      { hour: 0, height_m: 4.0 },
      { hour: 6, height_m: 2.2 },
      { hour: 7, height_m: 1.6 },
      { hour: 8, height_m: 1.0 },
      { hour: 12, height_m: 0.5 },
    ]
    expect(tideDirectionForWindow(startISO, endISO, points)).toBe('falling')
  })

  it('détecte l’étale (fenêtre plate malgré un vrai marnage journalier)', () => {
    const points: TidePoint[] = [
      { hour: 0, height_m: 0.2 },
      { hour: 6, height_m: 4.0 },
      { hour: 7, height_m: 4.02 },
      { hour: 8, height_m: 4.01 },
      { hour: 12, height_m: 0.5 },
    ]
    expect(tideDirectionForWindow(startISO, endISO, points)).toBe('slack')
  })

  it('renvoie null sans données ou avec moins de 2 points dans la fenêtre', () => {
    expect(tideDirectionForWindow(startISO, endISO, [])).toBeNull()
    expect(
      tideDirectionForWindow(startISO, endISO, [
        { hour: 6, height_m: 1.0 },
        { hour: 15, height_m: 2.0 },
      ]),
    ).toBeNull()
  })
})

describe('computeWindowOverlay — adaptateur mince + overlay perso', () => {
  it('le score de fenêtre est le score générique existant, INCHANGÉ', () => {
    const overlay = computeWindowOverlay(
      { ...morningWindow, score: 82, tideDirection: 'falling', windSpeedKmh: 8 },
      richTendencies(),
    )
    expect(overlay.score).toBe(82)
  })

  it('matche heure + marée + vent quand tout coïncide → kind perso, comptes réels', () => {
    const overlay = computeWindowOverlay(
      { ...morningWindow, score: 82, tideDirection: 'falling', windSpeedKmh: 8 },
      richTendencies(),
    )
    expect(overlay.kind).toBe('perso')
    expect(overlay.matched.map((m) => m.factor)).toEqual(['hour', 'tide', 'wind'])
    for (const m of overlay.matched) {
      // Comptes RÉELS issus des 4 prises fixées : 4 sur 4, jamais un chiffre inventé.
      expect(m.count).toBe(4)
      expect(m.sampleCount).toBe(4)
      expect(m.share).toBe(1)
    }
    expect(overlay.matched[0].label).toBe('le matin')
    expect(overlay.matched[1].label).toBe('en marée descendante')
    expect(overlay.matched[2].label).toBe('par vent léger')
  })

  it('un seul facteur coïncident suffit (fenêtre du soir mais marée descendante)', () => {
    expect(MIN_MATCHED_FACTORS).toBe(1)
    const overlay = computeWindowOverlay(
      { ...eveningWindow, score: 75, tideDirection: 'falling', windSpeedKmh: null },
      richTendencies(),
    )
    expect(overlay.kind).toBe('perso')
    expect(overlay.matched.map((m) => m.factor)).toEqual(['tide'])
  })

  it('aucune coïncidence → generique, matched vide', () => {
    const overlay = computeWindowOverlay(
      { ...eveningWindow, score: 90, tideDirection: 'rising', windSpeedKmh: 30 },
      richTendencies(),
    )
    expect(overlay.kind).toBe('generique')
    expect(overlay.matched).toEqual([])
  })

  it('signaux inconnus (marée/vent null) → pas de match fabriqué sur ces facteurs', () => {
    const overlay = computeWindowOverlay(
      { ...morningWindow, score: 82, tideDirection: null, windSpeedKmh: null },
      richTendencies(),
    )
    // Seule l’heure (toujours dérivable) peut matcher.
    expect(overlay.matched.map((m) => m.factor)).toEqual(['hour'])
  })

  it('cold start (1 prise) → generique même si la fenêtre coïncide', () => {
    const overlay = computeWindowOverlay(
      { ...morningWindow, score: 95, tideDirection: 'falling', windSpeedKmh: 8 },
      poorTendencies(),
    )
    expect(overlay.kind).toBe('generique')
    expect(overlay.matched).toEqual([])
    expect(overlay.trends.hasEnough).toBe(false)
  })
})
