import { SPECIES_BY_DB_KEY } from '@/lib/seo/programmatic'
import { speciesCover } from '@/lib/especes/covers'

/**
 * Planche de l'espèce à partir de la clé DB d'une prise.
 *
 * `catches.species` est du TEXTE LIBRE : aucune contrainte de base ne le borne
 * (cf le commentaire de CARNET_SPECIES_DB_KEYS dans lib/seo/programmatic). Une
 * prise importée ou plus ancienne peut donc porter une valeur hors référentiel.
 * Les deux `null` de cette fonction sont normaux et attendus — l'appelant retombe
 * sur son motif de repli, jamais sur une image cassée.
 */
export function speciesCoverForDbKey(dbKey: string | null | undefined): string | null {
  if (!dbKey) return null
  const slug = SPECIES_BY_DB_KEY[dbKey]
  return slug ? speciesCover(slug) : null
}
