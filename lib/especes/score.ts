import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { UserTier } from '@/lib/auth/tier'
import { fetchQualityCells } from '@/lib/map/quality'
import { scoreRegion } from '@/lib/geo/bbox'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

// Score régional PAR ESPÈCE de la fiche /especes (sprint 23, WS-B). Réutilise la RPC
// get_quality_cells (044) — score 0-100 DÉCOMPOSABLE (communauté k-anon K=3 + perso
// Itinérant via auth.uid()) — agrégé sur le périmètre de l'utilisateur (département si
// connu, sinon national). Aucun chiffre fabriqué (garde-fou honnêteté 7.5) : une
// composante absente est `null`, pas simulée. Anon/Discovery → communauté seule.

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

export async function getSpeciesRegionalScore(dbKey: string): Promise<SpeciesScore> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let tier: UserTier = 'anonymous'
  let homeDept: string | null = null
  if (user) {
    const [{ data: tierData }, { data: prof }] = await Promise.all([
      supabase.rpc('current_tier', { uid: user.id }),
      supabase.from('profiles').select('home_department').eq('id', user.id).maybeSingle(),
    ])
    tier = (tierData as UserTier) ?? 'discovery'
    homeDept = (prof?.home_department as string | null) ?? null
  }

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
