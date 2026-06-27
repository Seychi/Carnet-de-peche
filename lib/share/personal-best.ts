import { createClient } from '@/lib/supabase/server'

/**
 * Record perso (net-neuf, sprint 38 WS-D) : `true` si la taille de cette prise
 * est la PLUS GRANDE parmi MES prises de la même espèce. Strictement personnel
 * (jamais de comparaison inter-pêcheurs, anti-comparaison gravé sprint 26).
 *
 * Lecture TOUJOURS via `catches_for_viewer` filtrée `auth.uid()` serveur — jamais
 * la table `catches` (verrou colonne geom 041). La vue applique déjà floutage +
 * confidentialité ; on ne lit que `size_cm` ici (aucune coordonnée).
 *
 * Égalité : si plusieurs prises partagent la taille max (dont celle-ci), c'est un
 * record perso (`>=`). Renvoie `false` si la prise n'a pas de taille, ou si on ne
 * peut pas trancher (sécurité : pas de fausse pastille « record »).
 */
export async function isPersonalBest(
  catchId: string,
  species: string | null,
  sizeCm: number | null,
): Promise<boolean> {
  if (sizeCm == null || !species) return false

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('size_cm')
    .eq('user_id', user.id)
    .eq('species', species)
    .not('size_cm', 'is', null)
    .order('size_cm', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return false

  const maxSize = data[0].size_cm
  if (maxSize == null) return false

  // La prise courante est-elle (l'une des) plus grande(s) de l'espèce ?
  return sizeCm >= maxSize
}
