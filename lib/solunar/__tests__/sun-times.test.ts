import { describe, it, expect } from 'vitest'
import SunCalc from 'suncalc'
import { formatLocalTime } from '../format'
import { DEPARTMENT_SEA_COORDS } from '@/lib/geo/department-coords'

// Sprint 35 — garde-fou anti-régression sur les heures de soleil du SCORE solunar.
// Le bug /home « Soleil 08:19–00:23 » venait de l'affichage d'Open-Meteo, PAS de suncalc.
// Ce test verrouille le chemin du score : ordre des arguments getTimes(date, LAT, LNG)
// + formatage Europe/Paris (formatLocalTime). Brest le 2026-06-26 : lever ~06:17,
// coucher ~22:14 (heure locale FR). Déterministe (Intl avec timeZone explicite).
//
// Sprint 70 Bloc E (audit 2026-07-02 §4.3) — précision renforcée à ±3 min :
// l'audit suspectait un point de calcul ≈ 49.3N/5.5W en pleine mer. VÉRIFIÉ FAUX :
// /home calcule au point côtier du département du profil (DEPARTMENT_SEA_COORDS,
// dept 29 = 48.3N/4.6W « Brest (Iroise) »), à moins d'une minute des heures de
// Brest ville. Le point suspect aurait donné un coucher à 22:32 le 2026-07-02
// (+8 min) : l'app affichait 22:22, cohérent avec Brest. La valeur « réelle
// ~22:08 » citée par l'audit était elle-même erronée (éphémérides réelles à
// Brest le 02/07 : lever ~06:22, coucher ~22:23, confirmées suncalc + Open-Meteo).
const BREST_LAT = 48.39
const BREST_LNG = -4.49
const DAY = new Date('2026-06-26T10:00:00Z')

// Date fixe de référence sprint 70 + éphémérides réelles Brest (Europe/Paris, UTC+2).
const DAY_S70 = new Date('2026-07-02T12:00:00Z')
const REAL_SUNRISE = new Date('2026-07-02T06:22:00+02:00')
const REAL_SUNSET = new Date('2026-07-02T22:23:00+02:00')
const THREE_MIN_MS = 3 * 60 * 1000

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

  it('Brest 2026-07-02 : lever/coucher à ±3 min des éphémérides réelles (audit §4.3)', () => {
    const t = SunCalc.getTimes(DAY_S70, BREST_LAT, BREST_LNG)
    expect(Math.abs(t.sunrise.getTime() - REAL_SUNRISE.getTime())).toBeLessThanOrEqual(THREE_MIN_MS)
    expect(Math.abs(t.sunset.getTime() - REAL_SUNSET.getTime())).toBeLessThanOrEqual(THREE_MIN_MS)
  })

  it('le point de référence du dept 29 (/home) donne les heures de Brest à ±3 min', () => {
    // /home (cockpit + créneaux) calcule au point côtier du département du profil.
    // Ce test verrouille que ce point N'EST PAS un point lointain en pleine mer :
    // pour un profil brestois (dept 29), les heures de soleil au point de référence
    // collent à Brest ville à ±3 min (en pratique < 1 min).
    const ref = DEPARTMENT_SEA_COORDS['29']
    expect(ref).toBeDefined()
    const atRef = SunCalc.getTimes(DAY_S70, ref.lat, ref.lng)
    const atBrest = SunCalc.getTimes(DAY_S70, BREST_LAT, BREST_LNG)
    expect(Math.abs(atRef.sunrise.getTime() - atBrest.sunrise.getTime())).toBeLessThanOrEqual(THREE_MIN_MS)
    expect(Math.abs(atRef.sunset.getTime() - atBrest.sunset.getTime())).toBeLessThanOrEqual(THREE_MIN_MS)
  })

  it('contre-preuve : le point suspect de l’audit (49.3N/5.5W) serait HORS tolérance', () => {
    // Si /home calculait vraiment à 49.3N/5.5W, le coucher dériverait de ~8 min :
    // la tolérance ±3 min du test précédent l'aurait attrapé.
    const suspect = SunCalc.getTimes(DAY_S70, 49.3, -5.5)
    const atBrest = SunCalc.getTimes(DAY_S70, BREST_LAT, BREST_LNG)
    expect(Math.abs(suspect.sunset.getTime() - atBrest.sunset.getTime())).toBeGreaterThan(THREE_MIN_MS)
  })
})
