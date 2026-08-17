'use server'

import { getSpeciesScoreForViewer } from '@/lib/especes/score-viewer'
import type { SpeciesScore } from '@/lib/especes/score'
import { getPersonalTendencies } from '@/lib/scoring/personal'
import type { PersonalTendencies } from '@/lib/scoring/personal'
import { createClient } from '@/lib/supabase/server'

// Deltas CONNECTÉS de la fiche espèce (sprint 84).
//
// Pourquoi une Server Action et pas un rendu serveur : `/especes/[slug]` est
// pré-rendue et servie depuis le CDN. Tout ce qui dépend du visiteur doit donc sortir
// du HTML et être demandé APRÈS hydratation. Une Server Action a parfaitement le droit
// de lire les cookies : elle s'exécute à la requête, jamais au moment du pré-rendu.
//
// 🔒 Invariant : aucune de ces données n'entre dans un HTML mis en cache. Elles ne
// transitent qu'en réponse à un appel explicite du navigateur, avec la session de
// l'utilisateur, et l'uid est toujours résolu SERVEUR (jamais reçu du client).
//
// ⚠️ Un fichier `'use server'` n'exporte que des fonctions async (gotcha sprint 37) et
// ne ré-exporte aucun type (gotcha sprint 50) : les types sont importés directement
// depuis `lib/especes/score` et `lib/scoring/personal` par les composants clients.

/**
 * Score de l'espèce recalculé pour l'utilisateur courant (son département, sa
 * composante perso). `null` si personne n'est connecté : le client garde alors la
 * variante anonyme déjà affichée, sans le moindre clignotement.
 */
export async function fetchViewerSpeciesScore(dbKey: string): Promise<SpeciesScore | null> {
  return getSpeciesScoreForViewer(dbKey)
}

/**
 * Bloc perso de la sidebar : tendances descriptives + record de l'espèce.
 * `null` si personne n'est connecté (le serveur a déjà rendu l'état vide).
 *
 * Le record est lu sur `catches_for_viewer`, vue déjà scopée par `auth.uid()`, et on
 * filtre malgré tout explicitement sur `user_id` (anti-usurpation, modèle fetch.ts).
 *
 * Le type de retour est volontairement INFÉRÉ côté appelant
 * (`Awaited<ReturnType<typeof fetchViewerSpeciesPersonal>>`) : un fichier `'use server'`
 * n'exporte proprement que des fonctions async, un export de type y a déjà cassé un
 * build (gotcha sprint 50).
 */
export async function fetchViewerSpeciesPersonal(dbKey: string): Promise<{
  tendencies: PersonalTendencies
  record: { sizeCm: number | null; measuredCm: number | null; weightG: number | null }
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [tendencies, { data, error }] = await Promise.all([
    getPersonalTendencies({ species: dbKey }),
    supabase
      .from('catches_for_viewer')
      .select('size_cm, measured_length_cm, weight_g')
      .eq('user_id', user.id)
      .eq('species', dbKey)
      .limit(2000),
  ])

  if (error || !data || data.length === 0) {
    return { tendencies, record: { sizeCm: null, measuredCm: null, weightG: null } }
  }

  const max = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    return nums.length ? Math.max(...nums) : null
  }

  return {
    tendencies,
    record: {
      sizeCm: max(data.map((r) => r.size_cm)),
      measuredCm: max(data.map((r) => r.measured_length_cm)),
      weightG: max(data.map((r) => r.weight_g)),
    },
  }
}
