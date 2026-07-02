import { describe, it, expect } from 'vitest'
import {
  groupThousands,
  formatMetricValue,
  metricMeta,
  isSpeciesFilterable,
  rankMedal,
  resolveLeaderboardView,
  LEADERBOARD_METRICS,
  type LeaderboardRow,
} from '../leaderboard'

// Compare en aplatissant TOUTE espace (normale, insécable U+00A0, fine) en '_' → robuste
// quelle que soit la variété d'espace (le séparateur de milliers est un insécable).
const flat = (s: string) => s.replace(/\s+/g, '_')

describe('groupThousands', () => {
  it('ne groupe pas sous 1000', () => {
    expect(groupThousands(0)).toBe('0')
    expect(groupThousands(999)).toBe('999')
  })
  it('groupe les milliers avec un séparateur d’espace', () => {
    expect(flat(groupThousands(1234))).toBe('1_234')
    expect(flat(groupThousands(1234567))).toBe('1_234_567')
  })
  it('arrondit et reste déterministe (pas d’Intl)', () => {
    expect(flat(groupThousands(1499.7))).toBe('1_500')
  })
})

describe('formatMetricValue', () => {
  it('formate l’XP', () => {
    expect(flat(formatMetricValue('xp', 1500))).toBe('1_500_XP')
  })
  it('accorde le pluriel des prises', () => {
    expect(flat(formatMetricValue('catches', 1))).toBe('1_prise')
    expect(flat(formatMetricValue('catches', 3))).toBe('3_prises')
  })
  it('formate la plus grosse en cm', () => {
    expect(flat(formatMetricValue('biggest', 62))).toBe('62_cm')
  })
  it('accorde le pluriel des espèces', () => {
    expect(flat(formatMetricValue('diversity', 1))).toBe('1_espèce')
    expect(flat(formatMetricValue('diversity', 7))).toBe('7_espèces')
  })
  it('traite une valeur non finie comme 0', () => {
    expect(flat(formatMetricValue('xp', Number.NaN))).toBe('0_XP')
  })
})

describe('metricMeta / isSpeciesFilterable', () => {
  it('expose les 4 métriques, XP en tête (défaut)', () => {
    expect(LEADERBOARD_METRICS.map((m) => m.value)).toEqual([
      'xp',
      'catches',
      'biggest',
      'diversity',
    ])
    expect(metricMeta('xp').value).toBe('xp')
  })
  it('retombe sur XP pour une métrique inconnue', () => {
    // @ts-expect-error test d’un input hors type
    expect(metricMeta('bidon').value).toBe('xp')
  })
  it('le filtre espèce ne concerne que prises et plus grosse', () => {
    expect(isSpeciesFilterable('catches')).toBe(true)
    expect(isSpeciesFilterable('biggest')).toBe(true)
    expect(isSpeciesFilterable('xp')).toBe(false)
    expect(isSpeciesFilterable('diversity')).toBe(false)
  })
  it('« plus grosse » est la seule métrique verified-only', () => {
    expect(metricMeta('biggest').verifiedOnly).toBe(true)
    expect(metricMeta('xp').verifiedOnly).toBeUndefined()
  })
})

describe('rankMedal', () => {
  it('médaille le podium, rien au-delà', () => {
    expect(rankMedal(1)).toBe('🥇')
    expect(rankMedal(2)).toBe('🥈')
    expect(rankMedal(3)).toBe('🥉')
    expect(rankMedal(4)).toBeNull()
  })
})

// ── Sprint 69 : lisibilité à 1 joueur (resolveLeaderboardView) ──────────────────

function row(overrides: Partial<LeaderboardRow>): LeaderboardRow {
  return {
    rank: 1,
    userId: 'u1',
    username: 'pecheur',
    avatarUrl: null,
    metricValue: 100,
    isSelf: false,
    eligibleCount: 3,
    ...overrides,
  }
}

describe('resolveLeaderboardView', () => {
  it('0 ligne → état vide', () => {
    expect(resolveLeaderboardView([], 'national')).toEqual({ kind: 'empty' })
  })

  it('solo opté-in (eligible_count=1) → under_threshold avec « il en manque 2 »', () => {
    const mine = row({ isSelf: true, eligibleCount: 1 })
    const view = resolveLeaderboardView([mine], 'national')
    expect(view).toEqual({ kind: 'under_threshold', myRow: mine, missing: 2 })
  })

  it('2 éligibles → il en manque 1', () => {
    const mine = row({ isSelf: true, eligibleCount: 2 })
    const view = resolveLeaderboardView([mine], 'national')
    expect(view.kind).toBe('under_threshold')
    if (view.kind === 'under_threshold') expect(view.missing).toBe(1)
  })

  it('sous le seuil SANS ligne self (non opté-in) → vide, jamais d’identité tierce', () => {
    // Cas défensif : la RPC ne renvoie pas ce cas (identités gatées), mais le
    // client ne doit jamais rendre un « classement » d'une identité tierce isolée.
    const other = row({ isSelf: false, eligibleCount: 2 })
    expect(resolveLeaderboardView([other], 'national')).toEqual({ kind: 'empty' })
  })

  it('seuil K=3 atteint → tableau complet avec myRow repérée', () => {
    const rows = [
      row({ rank: 1, userId: 'a', eligibleCount: 3 }),
      row({ rank: 2, userId: 'me', isSelf: true, eligibleCount: 3 }),
      row({ rank: 3, userId: 'c', eligibleCount: 3 }),
    ]
    const view = resolveLeaderboardView(rows, 'national')
    expect(view.kind).toBe('table')
    if (view.kind === 'table') {
      expect(view.rows).toHaveLength(3)
      expect(view.myRow?.userId).toBe('me')
    }
  })

  it('scope follows : jamais de seuil (cercle choisi)', () => {
    const rows = [row({ isSelf: true, eligibleCount: 1 })]
    const view = resolveLeaderboardView(rows, 'follows')
    expect(view.kind).toBe('table')
  })
})
