import SunCalc from 'suncalc'
import type { SolunarEvent, SolunarEventType } from './types'
import { formatLocalTime, getParisHour } from './format'
import { SOLUNAR_CONFIG } from './config'

export function getMoonPhaseLabel(phase: number): string {
  if (phase < 0.0625 || phase >= 0.9375) return 'Nouvelle lune'
  if (phase < 0.1875) return 'Premier croissant'
  if (phase < 0.3125) return 'Premier quartier'
  if (phase < 0.4375) return 'Lune gibbeuse croissante'
  if (phase < 0.5625) return 'Pleine lune'
  if (phase < 0.6875) return 'Lune gibbeuse décroissante'
  if (phase < 0.8125) return 'Dernier quartier'
  return 'Dernier croissant'
}

function makeEvent(
  type: SolunarEventType,
  date: Date,
  moonPhase?: number,
  moonIllumination?: number
): SolunarEvent {
  return {
    type,
    timeISO: date.toISOString(),
    localTime: formatLocalTime(date),
    moonPhase,
    moonIllumination,
  }
}

function findMoonApexNadir(
  dayStart: Date,
  lat: number,
  lng: number,
  illum: SunCalc.GetMoonIlluminationResult
): { apex: Date | null; nadir: Date | null } {
  // 48 samples (30 min) sur 24h
  const SAMPLES = 48
  const STEP_MS = (24 * 60 * 60 * 1000) / SAMPLES

  let maxAlt = -Infinity
  let minAlt = Infinity
  let apexDate: Date | null = null
  let nadirDate: Date | null = null

  for (let i = 0; i < SAMPLES; i++) {
    const t = new Date(dayStart.getTime() + i * STEP_MS)
    const pos = SunCalc.getMoonPosition(t, lat, lng)
    const localH = getParisHour(t)

    if (pos.altitude > maxAlt) {
      maxAlt = pos.altitude
      // Ne garde l'apex que si dans la plage horaire autorisée
      apexDate = localH >= SOLUNAR_CONFIG.EARLIEST_HOUR && localH <= SOLUNAR_CONFIG.LATEST_HOUR ? t : null
    }
    if (pos.altitude < minAlt) {
      minAlt = pos.altitude
      nadirDate = localH >= SOLUNAR_CONFIG.EARLIEST_HOUR && localH <= SOLUNAR_CONFIG.LATEST_HOUR ? t : null
    }
  }

  // Si altitude max est sous l'horizon, pas d'apex utilisable
  if (maxAlt < 0) apexDate = null

  return { apex: apexDate, nadir: nadirDate }
}

export function getSolunarEvents(date: Date, lat: number, lng: number): SolunarEvent[] {
  const illum = SunCalc.getMoonIllumination(date)
  const sunTimes = SunCalc.getTimes(date, lat, lng)
  const moonTimes = SunCalc.getMoonTimes(date, lat, lng)

  // Début de la journée Paris (minuit local) pour la recherche apex/nadir
  const dayStartStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const dayStart = new Date(`${dayStartStr}T00:00:00+02:00`)

  const { apex, nadir } = findMoonApexNadir(dayStart, lat, lng, illum)

  const events: SolunarEvent[] = []

  // Événements solaires
  if (sunTimes.sunrise && isFinite(sunTimes.sunrise.getTime())) {
    const h = getParisHour(sunTimes.sunrise)
    if (h >= SOLUNAR_CONFIG.EARLIEST_HOUR && h <= SOLUNAR_CONFIG.LATEST_HOUR) {
      events.push(makeEvent('sunrise', sunTimes.sunrise))
    }
  }
  if (sunTimes.sunset && isFinite(sunTimes.sunset.getTime())) {
    const h = getParisHour(sunTimes.sunset)
    if (h >= SOLUNAR_CONFIG.EARLIEST_HOUR && h <= SOLUNAR_CONFIG.LATEST_HOUR) {
      events.push(makeEvent('sunset', sunTimes.sunset))
    }
  }

  // Événements lunaires
  if (moonTimes.rise && isFinite(moonTimes.rise.getTime())) {
    const h = getParisHour(moonTimes.rise)
    if (h >= SOLUNAR_CONFIG.EARLIEST_HOUR && h <= SOLUNAR_CONFIG.LATEST_HOUR) {
      events.push(makeEvent('moonrise', moonTimes.rise, illum.phase, illum.fraction))
    }
  }
  if (moonTimes.set && isFinite(moonTimes.set.getTime())) {
    const h = getParisHour(moonTimes.set)
    if (h >= SOLUNAR_CONFIG.EARLIEST_HOUR && h <= SOLUNAR_CONFIG.LATEST_HOUR) {
      events.push(makeEvent('moonset', moonTimes.set, illum.phase, illum.fraction))
    }
  }

  // Apex / nadir lunaire
  if (apex) {
    events.push(makeEvent('moon_apex', apex, illum.phase, illum.fraction))
  }
  if (nadir) {
    events.push(makeEvent('moon_nadir', nadir, illum.phase, illum.fraction))
  }

  // Tri chronologique
  return events.sort((a, b) => a.timeISO.localeCompare(b.timeISO))
}
