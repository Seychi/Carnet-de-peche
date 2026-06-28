import { createClient } from '@/lib/supabase/server'
import { toCatchSamples, bucketizeWind, type DbCatchRow, type WindBucket } from './buckets'
import { confidence, PERSONAL_CONFIG } from './config'
import type { Confidence } from './types'

// ─── WS B — « Le bon leurre pour aujourd'hui » (leurre × conditions du jour) ─────
// On croise les conditions du jour (marée + vent) avec l'historique leurre de
// l'utilisateur, STRICTEMENT DESCRIPTIVEMENT (« sur ces conditions, tu sors surtout
// le X »), JAMAIS prédictif (« utilise le X » / « ça va mordre »). On réutilise le
// même moteur que les tendances : toCatchSamples (vent réconcilié colonne↔jsonb,
// fallback leurre legacy, exclusion hors couverture) + bucketizeWind (mêmes seuils
// → cohérence garantie entre le bucket du jour et celui des prises). Aucun score
// 0-100 perso. Sous MIN_PER_FACTOR prises dans CES conditions → null (état honnête).

export type BestGearToday = {
  label: string // libellé du leurre dominant dans ces conditions
  share: number // part 0-1 parmi les prises de CES conditions ayant un leurre renseigné
  sampleCount: number // prises de CES conditions ayant un leurre renseigné (dénominateur)
  confidence: Confidence
  tideState: 'rising' | 'falling' | 'slack' // conditions ciblées (pour le libellé)
  windBucket: WindBucket // conditions ciblées (pour le libellé)
}

export type TodayConditions = {
  tideState: 'rising' | 'falling' | 'slack' | null
  windSpeedKmh: number | null
}

// Bucket dominant local (la fonction `dominant` de tendencies.ts n'est pas exportée ;
// on n'élargit pas sa surface pour un seul appel). Renvoie la valeur la plus fréquente
// avec son compte, ou null si la liste est vide.
function dominant(values: string[]): { value: string; count: number } | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best === null ? null : { value: best, count: bestCount }
}

/**
 * Leurre dominant de l'utilisateur COURANT POUR les conditions du jour (même marée
 * ET même bucket de vent). Lecture scopée serveur via `catches_for_viewer` filtrée
 * sur `auth.uid()` (anti-usurpation, même pattern que getPersonalTendencies). Le
 * bucket de vent du jour est dérivé avec `bucketizeWind` (mêmes seuils que pour les
 * prises). Renvoie null si conditions du jour incomplètes, non connecté, ou moins de
 * MIN_PER_FACTOR prises renseignées dans ces conditions.
 */
export async function getBestGearToday(today: TodayConditions): Promise<BestGearToday | null> {
  // Conditions du jour incomplètes → on ne peut pas matcher honnêtement.
  const dayTide = today.tideState
  const dayWindBucket = bucketizeWind(today.windSpeedKmh)
  if (!dayTide || !dayWindBucket) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('species, spot_id, caught_at, wind_speed_kmh, tide_state, conditions, gear_label, lure_model, lure_brand')
    .eq('user_id', user.id)
    .limit(2000)

  if (error || !data) return null

  const samples = toCatchSamples(data as DbCatchRow[])

  // Garde UNIQUEMENT les prises dans les MÊMES conditions que le jour : même marée,
  // même bucket de vent, et un leurre renseigné (absence ≠ valeur, comme le facteur gear).
  const gears: string[] = []
  for (const s of samples) {
    if (s.gear === null) continue
    if (s.tideState !== dayTide) continue
    if (bucketizeWind(s.windSpeedKmh) !== dayWindBucket) continue
    gears.push(s.gear)
  }

  const sampleCount = gears.length
  if (sampleCount < PERSONAL_CONFIG.MIN_PER_FACTOR) return null

  const dom = dominant(gears)
  if (!dom) return null

  return {
    label: dom.value,
    share: dom.count / sampleCount,
    sampleCount,
    confidence: confidence(sampleCount),
    tideState: dayTide,
    windBucket: dayWindBucket,
  }
}
