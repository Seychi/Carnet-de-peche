import { describe, it, expect } from 'vitest'
import SunCalc from 'suncalc'
import { formatLocalTime } from '../format'

// Sprint 35 — garde-fou anti-régression sur les heures de soleil du SCORE solunar.
// Le bug /home « Soleil 08:19–00:23 » venait de l'affichage d'Open-Meteo, PAS de suncalc.
// Ce test verrouille le chemin du score : ordre des arguments getTimes(date, LAT, LNG)
// + formatage Europe/Paris (formatLocalTime). Brest le 2026-06-26 : lever ~06:17,
// coucher ~22:14 (heure locale FR). Déterministe (Intl avec timeZone explicite).
const BREST_LAT = 48.39
const BREST_LNG = -4.49
const DAY = new Date('2026-06-26T10:00:00Z')

describe('heures de soleil solunar (suncalc, chemin du score)', () => {
  it('Brest 2026-06-26 : lever ~06h, coucher ~22h (Europe/Paris)', () => {
    const t = SunCalc.getTimes(DAY, BREST_LAT, BREST_LNG)
    const sunrise = formatLocalTime(t.sunrise)
    const sunset = formatLocalTime(t.sunset)
    // Heure correcte (et surtout PAS 08:xx / 00:xx = symptôme du +2h).
    expect(sunrise.startsWith('06:')).toBe(true)
    expect(sunset.startsWith('22:')).toBe(true)
  })

  it('sentinelle : un swap lat/lng donnerait des heures aberrantes', () => {
    // -4.49 en latitude ≈ quasi-équateur → jour ~12h symétrique, jamais 06h/22h.
    const swapped = SunCalc.getTimes(DAY, BREST_LNG, BREST_LAT)
    expect(formatLocalTime(swapped.sunrise).startsWith('06:')).toBe(false)
  })
})
