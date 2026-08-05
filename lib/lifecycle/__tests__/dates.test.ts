import { describe, it, expect } from 'vitest'
import {
  isoWeekdayOfDateKey,
  shiftDateKey,
  parisIsoWeekKey,
  isParisFriday,
  isParisWeekend,
  isExactlyDaysAfterInParis,
  formatRelativeDayLabel,
  formatWindowWhen,
} from '@/lib/lifecycle/dates'

// Ancrage calendaire du sprint : 2026-01-01 est un JEUDI (vérifiable à la main :
// 2024-01-01 lundi, +2 en 2025 année bissextile, +1 en 2026). Tout le reste en
// découle, donc aucun test ne se contente de ré-exécuter l'implémentation.

describe('isoWeekdayOfDateKey', () => {
  it('1er janvier 2026 = jeudi (4)', () => {
    expect(isoWeekdayOfDateKey('2026-01-01')).toBe(4)
  })

  it('dimanche vaut 7, pas 0 (norme ISO, pas getUTCDay)', () => {
    expect(isoWeekdayOfDateKey('2026-08-09')).toBe(7)
    expect(isoWeekdayOfDateKey('2026-08-10')).toBe(1) // lundi
  })
})

describe('shiftDateKey', () => {
  it('franchit un mois', () => {
    expect(shiftDateKey('2026-07-31', 1)).toBe('2026-08-01')
    expect(shiftDateKey('2026-08-01', -1)).toBe('2026-07-31')
  })

  it('franchit une année', () => {
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('gère le 29 février d’une année bissextile', () => {
    expect(shiftDateKey('2028-02-28', 1)).toBe('2028-02-29')
    expect(shiftDateKey('2028-02-29', 1)).toBe('2028-03-01')
  })
})

describe('parisIsoWeekKey', () => {
  it('invariant ISO : le 4 janvier est toujours en semaine 1', () => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      expect(parisIsoWeekKey(new Date(`${year}-01-04T12:00:00Z`))).toBe(`${year}-W01`)
    }
  })

  it('vendredi 7 août 2026 = 2026-W32 (exemple du brief)', () => {
    expect(parisIsoWeekKey(new Date('2026-08-07T09:00:00Z'))).toBe('2026-W32')
  })

  it('semaine suivante = clé différente (la dédup hebdo en dépend)', () => {
    expect(parisIsoWeekKey(new Date('2026-08-14T09:00:00Z'))).toBe('2026-W33')
  })

  it('bascule sur le jour de PARIS, pas sur le jour UTC', () => {
    // 22:30 UTC un samedi = 00:30 dimanche à Paris (CEST) : encore la même
    // semaine ISO, mais la veille du basculement. On vérifie surtout que le
    // calcul passe bien par parisDateKey (sinon on aurait W32 ici).
    expect(parisIsoWeekKey(new Date('2026-08-09T22:30:00Z'))).toBe('2026-W33')
  })
})

describe('isParisFriday / isParisWeekend', () => {
  it('vendredi 7 août 2026 en pleine journée', () => {
    expect(isParisFriday(new Date('2026-08-07T09:00:00Z'))).toBe(true)
    expect(isParisWeekend(new Date('2026-08-07T09:00:00Z'))).toBe(false)
  })

  it('22:30 UTC le jeudi = vendredi 00:30 à Paris → vendredi', () => {
    expect(isParisFriday(new Date('2026-08-06T22:30:00Z'))).toBe(true)
  })

  it('22:30 UTC le vendredi = samedi 00:30 à Paris → PLUS vendredi', () => {
    expect(isParisFriday(new Date('2026-08-07T22:30:00Z'))).toBe(false)
    expect(isParisWeekend(new Date('2026-08-07T22:30:00Z'))).toBe(true)
  })

  it('samedi et dimanche sont le week-end, lundi non', () => {
    expect(isParisWeekend(new Date('2026-08-08T09:00:00Z'))).toBe(true)
    expect(isParisWeekend(new Date('2026-08-09T09:00:00Z'))).toBe(true)
    expect(isParisWeekend(new Date('2026-08-10T09:00:00Z'))).toBe(false)
  })
})

describe('isExactlyDaysAfterInParis', () => {
  const now = new Date('2026-08-05T07:00:00Z') // mercredi 09:00 Paris (heure du cron)

  it('J+1 : onboardé la veille, quelle que soit l’heure de la veille', () => {
    expect(isExactlyDaysAfterInParis(now, new Date('2026-08-04T06:00:00Z'), 1)).toBe(true)
    expect(isExactlyDaysAfterInParis(now, new Date('2026-08-04T21:00:00Z'), 1)).toBe(true)
  })

  it('J+3 : exactement 3 jours, ni 2 ni 4 (pas de fenêtre glissante)', () => {
    expect(isExactlyDaysAfterInParis(now, new Date('2026-08-02T10:00:00Z'), 3)).toBe(true)
    expect(isExactlyDaysAfterInParis(now, new Date('2026-08-03T10:00:00Z'), 3)).toBe(false)
    expect(isExactlyDaysAfterInParis(now, new Date('2026-08-01T10:00:00Z'), 3)).toBe(false)
  })

  it('le même jour n’est jamais J+1', () => {
    expect(isExactlyDaysAfterInParis(now, new Date('2026-08-05T05:00:00Z'), 1)).toBe(false)
  })

  it('raisonne en jour civil de PARIS : 23:00 UTC le 3 = le 4 à Paris', () => {
    // 2026-08-03T23:00Z = 2026-08-04 01:00 Paris → J+1 par rapport au 5 août.
    expect(isExactlyDaysAfterInParis(now, new Date('2026-08-03T23:00:00Z'), 1)).toBe(true)
  })
})

describe('formatRelativeDayLabel / formatWindowWhen', () => {
  const now = new Date('2026-08-05T07:00:00Z') // mercredi 5 août, 09:00 Paris

  it('aujourd’hui et demain sont nommés, pas datés', () => {
    expect(formatRelativeDayLabel('2026-08-05T16:00:00Z', now)).toBe('Aujourd’hui')
    expect(formatRelativeDayLabel('2026-08-06T05:00:00Z', now)).toBe('Demain')
  })

  it('au-delà : jour + date en français, première lettre capitalisée', () => {
    const label = formatRelativeDayLabel('2026-08-08T05:00:00Z', now)
    expect(label).toMatch(/^Samedi 8 août$/)
  })

  it('formatWindowWhen colle le jour relatif à l’heure déjà formatée', () => {
    expect(formatWindowWhen('2026-08-06T04:10:00Z', '06:10', now)).toBe('Demain 06:10')
  })
})
