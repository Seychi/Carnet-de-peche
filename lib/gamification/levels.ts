// ─── Rangs & niveaux (source UNIQUE des paliers XP) ─────────────────────────────
// Sprint 60, Bloc 1. Le squelette dopamine : convertir un total d'XP (matérialisé
// dans `user_progress.total_xp`, alimenté par le ledger `xp_events`) en un rang lisible
// + une barre de progression vers le palier suivant.
//
// ⚠️ DEMANDER À JOHN : les NOMS de rangs (Mousse → Légende locale) et les SEUILS XP
// ci-dessous sont la PROPOSITION de l'audit (`AUDIT-2026-06-30-UX-DESIGN-GAMIFICATION.md`
// §2.2.1). C'est du BRANDING : John valide ou renomme avant lancement public. Ne pas
// dupliquer ces seuils ailleurs : tout consommateur (UI, futurs sprints) importe d'ici.
//
// Table EXPLICITE (préférée à la formule `round(100 · n^1.7)` pour la lisibilité produit).
// La courbe reste la même intention : croissance douce, jamais punitive.

export interface Rank {
  /** Niveau (1 = premier rang). Affiché en mono « Lv.5 ». */
  level: number
  /** Nom du rang (branding, à valider par John). */
  name: string
  /** XP cumulée minimale pour atteindre ce rang. */
  minXp: number
}

/**
 * Paliers de rangs, ordonnés par XP croissante. Le premier commence à 0 XP.
 * Source : audit §2.2.1 (proposition à valider). Ne PAS réordonner sans revalider.
 */
export const RANKS: readonly Rank[] = [
  { level: 1, name: 'Mousse', minXp: 0 },
  { level: 2, name: 'Pêcheur du dimanche', minXp: 100 },
  { level: 3, name: 'Habitué du bord', minXp: 300 },
  { level: 4, name: 'Pilier de digue', minXp: 700 },
  { level: 5, name: 'Fine gaule', minXp: 1500 },
  { level: 6, name: 'Connaisseur', minXp: 3000 },
  { level: 7, name: 'Spécialiste', minXp: 5500 },
  { level: 8, name: 'Maître du bord', minXp: 9000 },
  { level: 9, name: 'Légende locale', minXp: 15000 },
] as const

export interface LevelInfo {
  /** Niveau courant (1..RANKS.length). */
  level: number
  /** Nom du rang courant. */
  rankName: string
  /** Seuil XP du rang courant (XP cumulée pour l'atteindre). */
  currentThreshold: number
  /** Seuil XP du rang suivant, ou `null` au dernier palier. */
  nextThreshold: number | null
  /** XP acquise DANS le niveau courant (`total - currentThreshold`), bornée à ≥ 0. */
  xpIntoLevel: number
  /** XP nécessaire pour boucler le niveau courant (`next - current`), ou `null` au dernier. */
  xpForNextLevel: number | null
}

/**
 * Convertit une XP cumulée en rang + progression vers le palier suivant.
 * - `levelFromXp(0)` → Mousse.
 * - `levelFromXp(1500)` → Fine gaule.
 * - Au dernier rang : `nextThreshold` et `xpForNextLevel` valent `null` (barre pleine).
 * - Entrée négative / non finie : traitée comme 0 (défensif ; l'XP ne peut pas être < 0).
 */
export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Number.isFinite(totalXp) && totalXp > 0 ? Math.floor(totalXp) : 0

  // Dernier rang dont le seuil est atteint (RANKS est trié croissant, minXp[0] = 0).
  let idx = 0
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) idx = i
    else break
  }

  const current = RANKS[idx]
  const next = idx + 1 < RANKS.length ? RANKS[idx + 1] : null

  return {
    level: current.level,
    rankName: current.name,
    currentThreshold: current.minXp,
    nextThreshold: next ? next.minXp : null,
    xpIntoLevel: xp - current.minXp,
    xpForNextLevel: next ? next.minXp - current.minXp : null,
  }
}

/**
 * Fraction de progression (0..1) dans le niveau courant, pour la barre XP.
 * Renvoie 1 au dernier palier (rien à remplir de plus). Utilitaire d'affichage.
 */
export function levelProgress(info: LevelInfo): number {
  if (info.xpForNextLevel == null || info.xpForNextLevel <= 0) return 1
  return Math.min(1, Math.max(0, info.xpIntoLevel / info.xpForNextLevel))
}
