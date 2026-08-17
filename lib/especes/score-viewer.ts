import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { UserTier } from '@/lib/auth/tier'
import { computeSpeciesScore, type SpeciesScore } from './score'

// Variante VISITEUR du score par espèce (sprint 84).
//
// Ce fichier est le SEUL de la famille `lib/especes/score*` à lire les cookies, et il
// est volontairement isolé : `lib/especes/score.ts` est atteint par le rendu serveur
// de `/especes/[slug]`, qui doit rester statique. Ici on est appelé exclusivement par
// la Server Action `app/actions/species-insights.ts`, donc après hydratation, hors du
// HTML mis en cache.
//
// 🔒 Le tier vient de la RPC `current_tier` avec l'uid résolu SERVEUR, jamais un uid
// envoyé par le client (anti-usurpation, même modèle que lib/scoring/personal/fetch).

/**
 * Score de l'espèce pour l'utilisateur courant : périmètre de son département quand
 * il en a un, et composante perso réelle si son tier y donne droit (gating fait en
 * SQL par `get_quality_cells`, pas ici). Retombe sur `null` si personne n'est
 * connecté : l'appelant garde alors la variante anonyme déjà rendue.
 */
export async function getSpeciesScoreForViewer(dbKey: string): Promise<SpeciesScore | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: tierData }, { data: prof }] = await Promise.all([
    supabase.rpc('current_tier', { uid: user.id }),
    supabase.from('profiles').select('home_department').eq('id', user.id).maybeSingle(),
  ])
  const tier = ((tierData as UserTier) ?? 'discovery') as UserTier
  const homeDept = (prof?.home_department as string | null) ?? null

  return computeSpeciesScore(supabase, dbKey, tier, homeDept)
}
