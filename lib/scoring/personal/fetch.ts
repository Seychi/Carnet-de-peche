import { createClient } from '@/lib/supabase/server'
import { toCatchSamples, type DbCatchRow } from './buckets'
import { computePersonalTendencies } from './tendencies'
import { confidence, PERSONAL_CONFIG } from './config'
import type { PersonalTendencies, TendencyScope } from './types'

function empty(scope: TendencyScope): PersonalTendencies {
  return {
    species: scope.species ?? null,
    spotId: scope.spotId ?? null,
    sampleCount: 0,
    confidence: confidence(0),
    tendencies: [],
    hasEnough: false,
    minToUnlock: PERSONAL_CONFIG.MIN_FOR_TENDENCIES,
  }
}

/**
 * Tendances perso de l'utilisateur COURANT (résolu côté serveur), éventuellement
 * filtrées par espèce et/ou spot. La lecture passe TOUJOURS par la vue
 * `catches_for_viewer` filtrée sur `auth.uid()` serveur — jamais un uid client
 * (anti-usurpation, cf modèle get_quality_cells). Renvoie un résultat vide si
 * l'appelant n'est pas connecté.
 */
export async function getPersonalTendencies(scope: TendencyScope = {}): Promise<PersonalTendencies> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty(scope)

  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('species, spot_id, caught_at, wind_speed_kmh, tide_state, conditions, gear_label, lure_model, lure_brand')
    .eq('user_id', user.id)
    .limit(2000)

  if (error || !data) return empty(scope)

  const samples = toCatchSamples(data as DbCatchRow[])
  return computePersonalTendencies(samples, scope)
}
