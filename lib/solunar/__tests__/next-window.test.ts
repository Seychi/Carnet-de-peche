import { describe, it, expect } from 'vitest'
import { getUpcomingWindows, getNextBestWindow } from '../next-window'
import type { DailyForecast, FishingWindow, QualityLevel } from '../types'

// Fenêtre minimale relative à « maintenant » (offset en heures).
function win(offsetH: number, score = 50, quality: QualityLevel = 'moyenne'): FishingWindow {
  const start = new Date(Date.now() + offsetH * 3_600_000)
  const end = new Date(start.getTime() + 2 * 3_600_000)
  return {
    startTimeISO: start.toISOString(),
    endTimeISO: end.toISOString(),
    startLocal: '00:00',
    endLocal: '00:00',
    centerEvent: { type: 'moon_apex', timeISO: start.toISOString(), localTime: '00:00' },
    score,
    quality,
    factors: {
      solunar: 0,
      tide: 0,
      wind: 0,
      reasons: [],
      weights: { solunar: 0.4, tide: 0.35, wind: 0.25 },
      marnageM: null,
      tideNonDiscriminating: false,
    },
  }
}

function day(windows: FishingWindow[]): DailyForecast {
  return {
    date: '2026-06-24',
    windows,
    dayScore: 0,
    dayQuality: 'moyenne',
    sunrise: '06:00',
    sunset: '21:00',
    moonPhaseLabel: 'Nouvelle lune',
    moonIllumination: 0,
  }
}

describe('getUpcomingWindows', () => {
  it('exclut les fenêtres passées et trie par ordre chronologique', () => {
    const daily = [day([win(3), win(-3), win(1), win(25)])]
    const res = getUpcomingWindows(daily, 10)
    // -3h est passée (end à -1h) → exclue ; le reste trié croissant.
    expect(res).toHaveLength(3)
    const starts = res.map((w) => new Date(w.startTimeISO).getTime())
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
    // La plus proche (≈ +1h) arrive en premier, avant les +3h / +25h.
    expect(starts[0]).toBeLessThan(starts[1])
  })

  it('limite au nombre demandé', () => {
    const daily = [day([win(1), win(3), win(5), win(7)])]
    expect(getUpcomingWindows(daily, 2)).toHaveLength(2)
  })

  it('aplatit plusieurs jours', () => {
    const daily = [day([win(2)]), day([win(26), win(50)])]
    expect(getUpcomingWindows(daily, 10)).toHaveLength(3)
  })

  it('renvoie [] pour count 0 ou aucune fenêtre future', () => {
    expect(getUpcomingWindows([day([win(1)])], 0)).toHaveLength(0)
    expect(getUpcomingWindows([day([win(-5)])], 5)).toHaveLength(0)
    expect(getUpcomingWindows([], 5)).toHaveLength(0)
  })

  it('getNextBestWindow et getUpcomingWindows[0] partent du même ensemble futur', () => {
    const daily = [day([win(1, 40), win(3, 90, 'exceptionnelle')])]
    // next best = la fenêtre score >= bonne (3h), upcoming[0] = la plus proche (1h).
    expect(getNextBestWindow(daily)?.score).toBe(90)
    expect(getUpcomingWindows(daily, 1)[0].score).toBe(40)
  })
})
