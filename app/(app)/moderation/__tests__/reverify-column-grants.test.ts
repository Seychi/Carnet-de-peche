import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * Filet anti-régression « 0 spot(s) » de l'onglet Re-vérifier (sprint 70,
 * Bloc D — audit 07-02 §4.10).
 *
 * Cause racine : `spots` est verrouillée par des GRANTS COLONNE (028/043,
 * verrou geom) — les modérateurs restent le rôle `authenticated`, la RLS ne
 * bypass pas les privilèges colonne. Sélectionner une colonne NON grantée
 * (ex. verified_at, verification_level) fait échouer TOUTE la requête
 * PostgREST (« permission denied », avalé) → data/count null → « 0 spot(s) »
 * en permanence.
 *
 * Ce test reconstruit la liste des colonnes grantées depuis les migrations
 * (source de vérité) et vérifie que chaque `.from('spots').select('…')` direct
 * de la page modération ne lit QUE des colonnes grantées.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..', '..', '..')
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations')
const moderationPage = readFileSync(path.resolve(here, '..', 'page.tsx'), 'utf8')

// Colonnes grantées en SELECT sur public.spots (tous fichiers de migration).
function grantedSpotColumns(): Set<string> {
  const granted = new Set<string>()
  for (const file of readdirSync(migrationsDir)) {
    if (!file.endsWith('.sql')) continue
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
    const re = /grant\s+select\s*\(([^)]+)\)\s*on\s+public\.spots/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(sql)) !== null) {
      for (const col of m[1].split(',')) {
        const name = col.trim()
        if (name) granted.add(name)
      }
    }
  }
  return granted
}

// Selects directs sur la table spots dans la page modération.
function directSpotSelects(): string[] {
  const selects: string[] = []
  const re = /\.from\('spots'\)\s*\.select\(\s*'([^']+)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(moderationPage)) !== null) {
    selects.push(m[1])
  }
  return selects
}

describe('modération : selects directs sur spots vs grants colonne', () => {
  it('les migrations grantent bien un socle de colonnes sur spots', () => {
    const granted = grantedSpotColumns()
    // Sanity check : le verrou 028 + l'ajout 043 sont bien détectés.
    expect(granted.has('id')).toBe(true)
    expect(granted.has('moderation_status')).toBe(true)
    // geom précis JAMAIS granté (invariant floutage GPS).
    expect(granted.has('geom')).toBe(false)
  })

  it('la page modération trouve au moins un select direct sur spots', () => {
    expect(directSpotSelects().length).toBeGreaterThan(0)
  })

  it('chaque select direct sur spots ne lit que des colonnes grantées', () => {
    const granted = grantedSpotColumns()
    for (const select of directSpotSelects()) {
      for (const raw of select.split(',')) {
        const col = raw.trim()
        if (!col) continue
        expect(
          granted.has(col),
          `colonne '${col}' non grantée sur spots — la requête entière échouerait (permission denied) et l'onglet réafficherait « 0 spot(s) »`,
        ).toBe(true)
      }
    }
  })
})
