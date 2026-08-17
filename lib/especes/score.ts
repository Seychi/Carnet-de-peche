import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAnonClient } from '@/lib/supabase/anon'
import type { UserTier } from '@/lib/auth/tier'
import { fetchQualityCells } from '@/lib/map/quality'
import { scoreRegion } from '@/lib/geo/bbox'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// Score régional PAR ESPÈCE de la fiche /especes (sprint 23, WS-B). Réutilise la RPC
// get_quality_cells (044) — score 0-100 DÉCOMPOSABLE (communauté k-anon K=3 + perso
// Itinérant via auth.uid()) — agrégé sur le périmètre de l'utilisateur (département si
// connu, sinon national). Aucun chiffre fabriqué (garde-fou honnêteté 7.5) : une
// composante absente est `null`, pas simulée. Anon/Discovery → communauté seule.
//
// ⚠️ Sprint 84 — CE MODULE NE DOIT PLUS LIRE LES COOKIES. Il est atteint par le rendu
// SERVEUR de `/especes/[slug]`, une page mise en cache : un seul `cookies()` ici et les
// 26 fiches redeviennent dynamiques. La variante VISITEUR (tier, département, perso)
// vit désormais dans `lib/especes/score-viewer.ts`, appelée uniquement par une Server
// Action, donc après hydratation et jamais dans le HTML mis en cache.

export type SpeciesScore = {
  tier: UserTier
  regionLabel: string
  national: boolean
  hasSignal: boolean
  /** 0-100 — meilleure zone du périmètre (max des cellules). 0 si aucun signal. */
  score: number
  /** Communauté k-anon agrégée (null si aucune cellule ne dépasse K). */
  community: { catches: number; fishers: number } | null
  /** Perso : tes prises de l'espèce dans le périmètre (Itinérant ; null sinon/aucune). */
  perso: { catches: number } | null
}

/**
 * Cœur de calcul, partagé par la voie anonyme et la voie visiteur.
 * Le `supabase` reçu porte l'identité : client anon (auth.uid() NULL → composante
 * perso vide par construction) ou client de session (perso réel si Itinérant).
 */
export async function computeSpeciesScore(
  supabase: SupabaseClient,
  dbKey: string,
  tier: UserTier,
  homeDept: string | null,
): Promise<SpeciesScore> {
  const region = scoreRegion(
    homeDept,
    homeDept ? DEPARTMENT_LABELS[homeDept.trim()] : undefined,
  )

  const cells = await fetchQualityCells(supabase, region.bbox, region.zoom, {
    species: dbKey,
    days: 30,
  })

  let best = 0
  let comCatches = 0
  let comFishers = 0
  let persoCatches = 0
  for (const c of cells) {
    if (c.score > best) best = c.score
    comCatches += c.communityCount
    comFishers += c.fishersCount
    persoCatches += c.persoCount
  }

  const community = comCatches > 0 ? { catches: comCatches, fishers: comFishers } : null
  const perso = persoCatches > 0 ? { catches: persoCatches } : null

  return {
    tier,
    regionLabel: region.label,
    national: region.national,
    hasSignal: best > 0 || community !== null || perso !== null,
    score: best,
    community,
    perso,
  }
}

/**
 * Variante ANONYME, sans aucun cookie : c'est elle qui est rendue côté serveur et
 * mise en cache. Périmètre national (un anonyme n'a pas de département), composante
 * perso structurellement absente. Exactement ce qu'un visiteur sans compte voit
 * aujourd'hui, donc exactement ce que voit Googlebot : le HTML servi ne change pas.
 */
export async function getSpeciesRegionalScoreAnon(dbKey: string): Promise<SpeciesScore> {
  const supabase = createAnonClient()
  return computeSpeciesScore(supabase, dbKey, 'anonymous', null)
}
