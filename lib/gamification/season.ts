// ─── Saisons trimestrielles nommées (Sprint 67) — helpers PURS ──────────────────
// Les CLASSEMENTS de saison (get_leaderboard) se remettent à zéro à chaque trimestre
// civil (décision John 2026-07-02). La FRONTIÈRE et la clé technique ('2026-Q3') sont
// calculées en SQL (season_window, Europe/Paris) → source unique, pas de dérive de fuseau.
// Ce module ne fait QUE mapper une clé de saison en LIBELLÉ humain (« Été 2026 ») et
// dériver les clés des saisons passées par arithmétique (aucun calcul de fuseau ici).
//
// Convention de nommage (trimestre civil) : Q1 Hiver · Q2 Printemps · Q3 Été · Q4 Automne.
// C'est un libellé de trimestre, honnête et lisible — pas une prétention météorologique.

export const SEASON_QUARTER_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Hiver',
  2: 'Printemps',
  3: 'Été',
  4: 'Automne',
}

export type ParsedSeason = { year: number; quarter: 1 | 2 | 3 | 4 }

/** Parse une clé '2026-Q3' → { year: 2026, quarter: 3 }. null si mal formée. */
export function parseSeasonKey(key: string | null | undefined): ParsedSeason | null {
  if (!key) return null
  const m = /^(\d{4})-Q([1-4])$/.exec(key.trim())
  if (!m) return null
  return { year: Number(m[1]), quarter: Number(m[2]) as 1 | 2 | 3 | 4 }
}

/** Libellé humain d'une saison : '2026-Q3' → « Été 2026 ». Repli sur la clé si non parsable. */
export function seasonLabelFromKey(key: string | null | undefined): string {
  const p = parseSeasonKey(key)
  if (!p) return key ?? 'Saison'
  return `${SEASON_QUARTER_NAMES[p.quarter]} ${p.year}`
}

/**
 * Clé de la saison à `offset` trimestres d'une clé donnée (offset négatif = passé).
 * Arithmétique pure année+trimestre (les frontières de fuseau sont l'affaire du SQL) :
 * '2026-Q1' avec offset -1 → '2025-Q4'.
 */
export function shiftSeasonKey(key: string, offset: number): string | null {
  const p = parseSeasonKey(key)
  if (!p) return null
  // Index de trimestre absolu (0-based) depuis l'an 0, pour un décalage sans branchement.
  const idx = p.year * 4 + (p.quarter - 1) + offset
  const year = Math.floor(idx / 4)
  const quarter = (idx % 4) + 1
  return `${year}-Q${quarter}`
}

export type SeasonOption = { offset: number; key: string; label: string }

/**
 * Options « saison courante + N saisons précédentes », pour le sélecteur de /classements.
 * `currentKey` vient de season_window(0) (SQL). offset 0 = courante, -1 = précédente…
 */
export function seasonOptions(currentKey: string, pastCount = 3): SeasonOption[] {
  const opts: SeasonOption[] = [{ offset: 0, key: currentKey, label: seasonLabelFromKey(currentKey) }]
  for (let i = 1; i <= pastCount; i++) {
    const key = shiftSeasonKey(currentKey, -i)
    if (key) opts.push({ offset: -i, key, label: seasonLabelFromKey(key) })
  }
  return opts
}
