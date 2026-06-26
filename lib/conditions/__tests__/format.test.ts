import { describe, it, expect } from 'vitest'
import { formatWeatherTime, degreesToCompass, beaufortLabel, waveLabel } from '../format'

describe('formatWeatherTime (sprint 35 — bug /home « Soleil 08:19–00:23 »)', () => {
  it('lit HH:MM directement dans une chaîne Open-Meteo locale (PAS de re-décalage +2h)', () => {
    // Open-Meteo appelé avec &timezone=Europe/Paris renvoie un ISO LOCAL sans fuseau.
    // "06:17" = déjà heure de Paris → doit rester "06:17" (et surtout pas "08:17").
    expect(formatWeatherTime('2026-06-26T06:17')).toBe('06:17')
    expect(formatWeatherTime('2026-06-26T22:14')).toBe('22:14')
  })

  it('ne décale jamais un coucher tardif vers le lendemain (00:xx)', () => {
    // Avant le fix : 22:14 → new Date(UTC) + Intl Paris = 00:14. Régression à bloquer.
    expect(formatWeatherTime('2026-06-26T22:14')).not.toMatch(/^00:/)
  })

  it('avec secondes', () => {
    expect(formatWeatherTime('2026-06-26T06:17:00')).toBe('06:17')
  })

  it('null / undefined / vide → null', () => {
    expect(formatWeatherTime(null)).toBeNull()
    expect(formatWeatherTime(undefined)).toBeNull()
    expect(formatWeatherTime('')).toBeNull()
  })

  it('chaîne sans heure → null', () => {
    expect(formatWeatherTime('2026-06-26')).toBeNull()
  })

  it('filet : un ISO UTC explicite (suffixe Z) est formaté en Europe/Paris', () => {
    // 04:17 UTC = 06:17 Paris en été. Branche défensive (Open-Meteo ne renvoie pas ça
    // aujourd'hui, mais si la source changeait, on ne doit pas casser).
    expect(formatWeatherTime('2026-06-26T04:17:00Z')).toBe('06:17')
  })
})

// Garde-fou : les autres helpers du module restent intacts.
describe('format helpers conditions (régression)', () => {
  it('degreesToCompass', () => {
    expect(degreesToCompass(0)).toBe('N')
    expect(degreesToCompass(90)).toBe('E')
  })
  it('beaufortLabel', () => {
    expect(beaufortLabel(0)).toBe('Calme')
    expect(beaufortLabel(100)).toBe('Coup de vent')
  })
  it('waveLabel', () => {
    expect(waveLabel(0)).toBe('Plate')
    expect(waveLabel(5)).toBe('Forte mer')
  })
})
