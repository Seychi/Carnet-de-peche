import { createClient } from '@/lib/supabase/server'

// ─── Rareté des badges (Sprint 67, Bloc 2) ──────────────────────────────────────
// « X % des pêcheurs l'ont » par badge, via la RPC get_badge_rarity (103) : agrégat
// OPAQUE (un compte de détenteurs / un total), n'expose JAMAIS l'identité des détenteurs.
// Dénominateur = pêcheurs ACTIFS (≥ 1 prise) → honnête (« parmi ceux qui pêchent »), pas
// gonflé par les inscrits fantômes. Calculé à la lecture (dataset minuscule) + cache RSC.

export type BadgeRarity = { slug: string; holders: number; total: number; pct: number }

/**
 * Récupère la rareté de chaque badge, indexée par slug. Best-effort : objet vide si erreur
 * (l'UI masque simplement la ligne rareté). Un slug que PERSONNE ne détient est absent de la
 * réponse (holders ≥ 1 par construction du GROUP BY) → pas de « 0 % » trompeur affiché.
 */
export async function getBadgeRarity(): Promise<Record<string, BadgeRarity>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_badge_rarity')
  const out: Record<string, BadgeRarity> = {}
  if (error || !data) return out
  for (const r of data as { badge_slug: string; holders: number; total: number }[]) {
    const holders = Number(r.holders) || 0
    const total = Number(r.total) || 0
    // total 0 → pct 0 (aucun pêcheur actif : cas de base vide, l'UI n'affiche rien d'utile).
    const pct = total > 0 ? Math.round((holders / total) * 100) : 0
    out[r.badge_slug] = { slug: r.badge_slug, holders, total, pct }
  }
  return out
}
