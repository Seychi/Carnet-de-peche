// ─── Classements (Sprint 66, dopamine multi-joueur) — helpers PURS ──────────────
// Types + libellés + formatage des métriques de classement. AUCUN accès données ici
// (la lecture passe par app/actions/leaderboard.ts → RPC get_leaderboard). Ce module est
// importable client ET serveur, et testé (leaderboard.test.ts).
//
// Garde-fou : une valeur de métrique est TOUJOURS un nombre (XP, compteur, longueur cm) —
// jamais une coordonnée. Le classement n'expose aucun spot (cf migration 102).

export type LeaderboardScope = 'national' | 'department' | 'follows'
export type LeaderboardMetric = 'xp' | 'catches' | 'biggest' | 'diversity'
export type LeaderboardPeriod = 'season' | 'all_time'

export interface LeaderboardParams {
  scope: LeaderboardScope
  /** Département côtier (requis pour scope 'department'). */
  dept?: string | null
  /** dbKey espèce (filtre optionnel ; ignoré pour metric 'xp'/'diversity'). */
  species?: string | null
  period: LeaderboardPeriod
  metric: LeaderboardMetric
  /**
   * Décalage de saison (Sprint 67) : 0 = saison courante, -1 = précédente… Ignoré quand
   * period = 'all_time'. Permet de consulter un classement de saison passée (recalcul exact).
   */
  seasonOffset?: number
}

export interface LeaderboardRow {
  rank: number
  userId: string
  username: string | null
  avatarUrl: string | null
  metricValue: number
}

// ── Métriques (source unique des libellés + du formatage) ──────────────────────
export interface LeaderboardMetricMeta {
  value: LeaderboardMetric
  /** Libellé de l'onglet/sélecteur. */
  label: string
  /** Description courte (aide sous le sélecteur). */
  hint: string
  /** true → « plus grosse » : records mesurés+photo-vérifiés (badge « vérifié »). */
  verifiedOnly?: boolean
  /** true → le filtre espèce s'applique (catches/biggest). */
  speciesFilterable?: boolean
}

export const LEADERBOARD_METRICS: readonly LeaderboardMetricMeta[] = [
  { value: 'xp', label: 'XP de la saison', hint: 'La régularité paie : toute ton activité comptée.' },
  { value: 'catches', label: 'Prises', hint: 'Nombre de prises partagées publiquement.', speciesFilterable: true },
  { value: 'biggest', label: 'Plus grosse', hint: 'Records mesurés et photo-vérifiés.', verifiedOnly: true, speciesFilterable: true },
  { value: 'diversity', label: 'Espèces', hint: "Nombre d'espèces différentes attrapées." },
] as const

export const LEADERBOARD_SCOPES: readonly { value: LeaderboardScope; label: string }[] = [
  { value: 'national', label: 'National' },
  // « Département » (pas « Mon département ») : le sélecteur laisse choisir n'importe quel
  // département côtier, défaut = celui de l'utilisateur. Label aligné sur ce comportement.
  { value: 'department', label: 'Département' },
  { value: 'follows', label: 'Mes pêcheurs' },
] as const

export const LEADERBOARD_PERIODS: readonly { value: LeaderboardPeriod; label: string }[] = [
  { value: 'season', label: 'Saison' },
  { value: 'all_time', label: 'Depuis le début' },
] as const

export function metricMeta(metric: LeaderboardMetric): LeaderboardMetricMeta {
  return LEADERBOARD_METRICS.find((m) => m.value === metric) ?? LEADERBOARD_METRICS[0]
}

export function isSpeciesFilterable(metric: LeaderboardMetric): boolean {
  return metricMeta(metric).speciesFilterable === true
}

/**
 * Groupe les milliers avec une espace insécable, de façon DÉTERMINISTE (identique
 * serveur et client → pas de mismatch d'hydratation, contrairement à Intl dont le
 * séparateur diffère entre Node et le navigateur).
 */
export function groupThousands(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Formate une valeur de métrique pour l'affichage. Le nombre passe en JetBrains Mono
 * côté UI (règle DA « tout chiffre métier en mono ») ; ici on ne renvoie que le texte.
 */
export function formatMetricValue(metric: LeaderboardMetric, value: number): string {
  const v = Number.isFinite(value) ? value : 0
  switch (metric) {
    case 'xp':
      return `${groupThousands(v)} XP`
    case 'catches':
      return `${groupThousands(v)} prise${v > 1 ? 's' : ''}`
    case 'biggest':
      return `${groupThousands(v)} cm`
    case 'diversity':
      return `${groupThousands(v)} espèce${v > 1 ? 's' : ''}`
    default:
      return groupThousands(v)
  }
}

/** Médaille pour le podium (rangs 1-3), sinon le rang en clair. Jamais par la seule teinte. */
export function rankMedal(rank: number): string | null {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}
