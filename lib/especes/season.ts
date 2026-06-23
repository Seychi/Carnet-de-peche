// Helper saisons (sprint 23, WS-B / D-B3) — « meilleurs créneaux PAR ESPÈCE » dérivés
// de content.saisons (activité 1-3 par façade, donnée éditoriale structurée), PAS d'un
// solunar générique maquillé. Pur → testable. Le solunar (lib/solunar) reste
// espèce-agnostique et dépend d'un spot + conditions live ; ici, sur une fiche espèce
// nationale sans spot, le signal « par espèce » honnête vient des saisons.

export type SaisonRow = { saison: string; activite: 1 | 2 | 3; note: string }

const ORDER: readonly string[] = ['Printemps', 'Été', 'Automne', 'Hiver']

/** Saison météorologique courante (Mar-Mai / Juin-Août / Sep-Nov / Déc-Fév). */
export function currentSeason(date: Date): string {
  const m = date.getMonth() + 1 // 1-12
  if (m >= 3 && m <= 5) return 'Printemps'
  if (m >= 6 && m <= 8) return 'Été'
  if (m >= 9 && m <= 11) return 'Automne'
  return 'Hiver'
}

/** Ligne saison correspondant à `season` (ou null si absente). */
export function seasonRow(saisons: SaisonRow[], season: string): SaisonRow | null {
  return saisons.find((s) => s.saison === season) ?? null
}

/** Saison de plus forte activité (tie-break par ordre calendaire). */
export function peakSeason(saisons: SaisonRow[]): SaisonRow | null {
  if (saisons.length === 0) return null
  return [...saisons].sort(
    (a, b) => b.activite - a.activite || ORDER.indexOf(a.saison) - ORDER.indexOf(b.saison),
  )[0]
}
