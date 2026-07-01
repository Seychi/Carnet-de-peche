// ─── Détection « un record vient de tomber » (Sprint 61, Bloc 0) ───────────────
//
// Le trigger du Sprint 60 (migration 098) écrit des lignes `xp_events` à CHAQUE insert
// de prise (kinds : `catch`, `new_species`, `personal_best`, `measured`, `released` —
// tous `ref_type='catch'`, `ref_id = catch.id`). award_xp renvoie `void` : pour savoir
// ce qui a été octroyé à CETTE prise, on RELIT le ledger (RLS own-only l'autorise).
// On se fie au LEDGER, jamais à un recalcul client divergent (garde-fou du brief).
//
// ⚠️ Conséquence assumée (cf Sprint 60, anti-farm) : `personal_best` n'est écrit que
// pour une prise PHOTO-VÉRIFIÉE (« prise mesurée » : longueur + objet de référence)
// qui bat STRICTEMENT le meilleur mesuré+vérifié antérieur de l'espèce. Donc le record
// se fête pour un record MESURÉ, pas pour n'importe quelle prise plus grosse déclarée.
// C'est cohérent avec le Sprint 60 ; le trigger n'est PAS touché ici (lecture seule).
//
// Les badges (Sprint 56/66) ne sont PAS recalculés par le trigger : on appelle
// explicitement recompute_my_badges() après le log et on détecte les badges dont
// `earned_at >= created_at` de la prise (même horloge Postgres → pas de dérive).

import type { createClient } from '@/lib/supabase/server'
import * as badgesModule from './badges'
import type { UserBadgeRow } from './badges'

type Client = Awaited<ReturnType<typeof createClient>>

// Résolution du libellé d'un badge RÉSILIENTE au refactor du Sprint 62 (clone partagé,
// cf gotcha « parallel-sessions-same-clone ») : selon l'ordre de merge, `badges.ts` expose
// soit `BADGE_BY_SLUG[slug]` (Sprint 60 : { label, description }), soit `badgeTierLabel(slug)`
// (Sprint 62 : label à paliers, sans description). On sonde les DEUX par clé string → ce
// module compile et fonctionne avec l'une OU l'autre API, quel que soit l'ordre de merge
// 61/62. À l'intégration finale, on pourra simplifier vers l'API retenue.
const badgesApi = badgesModule as unknown as {
  BADGE_BY_SLUG?: Record<string, { label?: string; description?: string }>
  badgeTierLabel?: (slug: string) => string
}

function resolveBadgeLabel(slug: string): { label: string; description?: string } {
  const legacy = badgesApi.BADGE_BY_SLUG?.[slug]
  if (legacy?.label) return { label: legacy.label, description: legacy.description }
  const tierLabel = badgesApi.badgeTierLabel
  if (typeof tierLabel === 'function') {
    const l = tierLabel(slug)
    if (l) return { label: l }
  }
  return { label: slug }
}

/** Un badge nouvellement débloqué au log (métadonnées prêtes pour l'UI, pas d'icône DB). */
export type CelebrationBadge = {
  slug: string
  label: string
  /** Optionnel : le modèle de badges à paliers (Sprint 62) n'a pas de description. */
  description?: string
}

/** Ce que l'app peut fêter au retour du log d'une prise. `null` = rien à fêter. */
export type CatchCelebration = {
  /** Espèce de la prise (clé DB) — pour libeller la fête « nouvelle espèce ». */
  species: string
  /** Kinds d'XP octroyés à cette prise (source de vérité = ledger). */
  kinds: string[]
  /** XP total octroyé par cette prise. */
  xpGained: number
  /** XP par kind (ex. { personal_best: 30, new_species: 50 }). */
  xpByKind: Record<string, number>
  /** Nouvelle espèce (1re prise de cette espèce). */
  newSpecies: boolean
  /** Record perso mesuré tombé à cette prise (ancien record si retrouvable). */
  newRecord: { species: string; length: number; previousBest: number | null } | null
  /** Badges débloqués par ce log (jamais un badge déjà obtenu avant). */
  newBadges: CelebrationBadge[]
}

type BuildArgs = {
  userId: string
  catchId: string
  species: string
  /** Longueur mesurée de la prise (cm), ou null si non mesurée. */
  measuredLength: number | null
  /** `created_at` de la prise insérée (ISO). Requis pour détecter les nouveaux badges. */
  catchCreatedAt: string | null
}

/**
 * Construit l'objet de célébration à partir du ledger + des badges. TOUT est best-effort
 * (chaque bloc a son try/catch) : une source en échec n'empêche jamais les autres, et la
 * fonction ne throw JAMAIS (le log de prise a déjà réussi à l'appel). Renvoie `null`
 * quand il n'y a rien à fêter → l'app garde son comportement habituel (navigation directe).
 */
export async function buildCatchCelebration(
  supabase: Client,
  { userId, catchId, species, measuredLength, catchCreatedAt }: BuildArgs
): Promise<CatchCelebration | null> {
  // 1. XP octroyée à cette prise (ledger own-only)
  const kinds: string[] = []
  const xpByKind: Record<string, number> = {}
  try {
    const { data, error } = await supabase
      .from('xp_events')
      .select('kind, points')
      .eq('user_id', userId)
      .eq('ref_type', 'catch')
      .eq('ref_id', catchId)
    if (!error && data) {
      for (const row of data as { kind: string; points: number }[]) {
        kinds.push(row.kind)
        xpByKind[row.kind] = (xpByKind[row.kind] ?? 0) + row.points
      }
    }
  } catch (e) {
    console.error('[celebration] lecture xp_events échouée (non bloquant) :', e)
  }

  const newSpecies = kinds.includes('new_species')

  // 2. Record perso : uniquement si le LEDGER a écrit un personal_best (photo-vérifié).
  let newRecord: CatchCelebration['newRecord'] = null
  if (kinds.includes('personal_best') && measuredLength != null) {
    let previousBest: number | null = null
    try {
      // Ancien record = meilleure longueur mesurée parmi les AUTRES prises photo-vérifiées
      // de l'espèce (même filtre que le trigger 098). La prise courante étant le nouveau
      // max, l'exclure par id donne bien le record précédent.
      const { data: prev } = await supabase
        .from('catches')
        .select('measured_length_cm')
        .eq('user_id', userId)
        .eq('species', species)
        .not('photo_verified_at', 'is', null)
        .not('measured_length_cm', 'is', null)
        .neq('id', catchId)
        .order('measured_length_cm', { ascending: false })
        .limit(1)
        .maybeSingle()
      previousBest = (prev?.measured_length_cm as number | null | undefined) ?? null
    } catch (e) {
      console.error('[celebration] lecture ancien record échouée (non bloquant) :', e)
    }
    newRecord = { species, length: measuredLength, previousBest }
  }

  // 3. Badges nouvellement débloqués par CE log. recompute_my_badges() renvoie l'ENSEMBLE
  //    des badges (avec earned_at figé) → « nouveau » = earned_at >= created_at de la prise.
  //    Sans created_at (cas dégradé), on NE fête AUCUN badge (évite de re-fêter d'anciens).
  const newBadges: CelebrationBadge[] = []
  if (catchCreatedAt) {
    try {
      const { data, error } = await supabase.rpc('recompute_my_badges')
      if (!error && data) {
        const t0 = new Date(catchCreatedAt).getTime()
        for (const badge of data as UserBadgeRow[]) {
          if (!badge.earned_at) continue
          if (new Date(badge.earned_at).getTime() < t0) continue
          const { label, description } = resolveBadgeLabel(badge.badge_slug)
          newBadges.push({ slug: badge.badge_slug, label, description })
        }
      }
    } catch (e) {
      console.error('[celebration] recompute_my_badges échoué (non bloquant) :', e)
    }
  }

  const hasSomething = newRecord !== null || newSpecies || newBadges.length > 0
  if (!hasSomething) return null

  const xpGained = Object.values(xpByKind).reduce((a, b) => a + b, 0)
  return { species, kinds, xpGained, xpByKind, newSpecies, newRecord, newBadges }
}
