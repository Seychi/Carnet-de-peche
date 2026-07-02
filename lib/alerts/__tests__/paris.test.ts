import { describe, it, expect } from 'vitest'
import {
  parisDateKey,
  nextDateKey,
  tomorrowParisDateKey,
  parisMinutesOfDay,
  buildWindowLabel,
} from '../paris'

describe('parisDateKey — jour civil de Paris', () => {
  it('lit le jour de Paris en été (CEST, UTC+2)', () => {
    // 23:30Z le 2 juillet = 01:30 Paris le 3 juillet
    expect(parisDateKey(new Date('2026-07-02T23:30:00Z'))).toBe('2026-07-03')
  })
  it('lit le jour de Paris en hiver (CET, UTC+1)', () => {
    // 23:30Z le 15 janvier = 00:30 Paris le 16 janvier
    expect(parisDateKey(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16')
    expect(parisDateKey(new Date('2026-01-15T22:30:00Z'))).toBe('2026-01-15')
  })
})

describe('nextDateKey / tomorrowParisDateKey — arithmétique de calendrier', () => {
  it('incrémente un jour ordinaire', () => {
    expect(nextDateKey('2026-07-02')).toBe('2026-07-03')
  })
  it('franchit la fin de mois et la fin d’année', () => {
    expect(nextDateKey('2026-07-31')).toBe('2026-08-01')
    expect(nextDateKey('2026-12-31')).toBe('2027-01-01')
  })
  it('gère février (année bissextile et non bissextile)', () => {
    expect(nextDateKey('2028-02-28')).toBe('2028-02-29')
    expect(nextDateKey('2026-02-28')).toBe('2026-03-01')
  })
  it('donne le lendemain vu de Paris à 17h (cadence du cron)', () => {
    // 15:00Z = 17:00 Paris (été)
    expect(tomorrowParisDateKey(new Date('2026-07-02T15:00:00Z'))).toBe('2026-07-03')
  })
  it('reste exact la veille du passage à l’heure d’été (nuit du 28 au 29 mars 2026)', () => {
    // 22:30Z le 28 mars = 23:30 Paris (CET). Ajouter 24 h à l’instant puis relire la
    // date de Paris donnerait le 30 mars (le 29 ne dure que 23 h) : l’arithmétique
    // de calendrier, elle, donne bien le 29.
    expect(tomorrowParisDateKey(new Date('2026-03-28T22:30:00Z'))).toBe('2026-03-29')
  })
})

describe('parisMinutesOfDay — minutes depuis minuit à Paris', () => {
  it('bords des quiet hours en été (CEST)', () => {
    expect(parisMinutesOfDay(new Date('2026-07-02T18:59:00Z'))).toBe(20 * 60 + 59) // 20:59
    expect(parisMinutesOfDay(new Date('2026-07-02T19:00:00Z'))).toBe(21 * 60) // 21:00
    expect(parisMinutesOfDay(new Date('2026-07-02T04:59:00Z'))).toBe(6 * 60 + 59) // 06:59
    expect(parisMinutesOfDay(new Date('2026-07-02T05:00:00Z'))).toBe(7 * 60) // 07:00
  })
  it('lit l’heure d’hiver (CET)', () => {
    expect(parisMinutesOfDay(new Date('2026-01-15T20:30:00Z'))).toBe(21 * 60 + 30) // 21:30
  })
})

describe('buildWindowLabel — « demain HH:MM »', () => {
  it('formate l’heure de Paris de la fenêtre', () => {
    // 04:10Z = 06:10 Paris (été)
    expect(buildWindowLabel('2026-07-03T04:10:00Z')).toBe('demain 06:10')
  })
  it('formate en heure d’hiver', () => {
    // 05:10Z = 06:10 Paris (hiver)
    expect(buildWindowLabel('2026-01-16T05:10:00Z')).toBe('demain 06:10')
  })
})
