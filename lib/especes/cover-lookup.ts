import { SPECIES, SPECIES_BY_DB_KEY, type SpeciesSlug } from '@/lib/seo/programmatic'
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

/**
 * Texte alternatif d'une planche d'espèce.
 *
 * C'est LE signal que Google dit être « le plus important » pour comprendre une
 * image, avec le nom de fichier et le contexte de page. Les planches sont donc
 * décrites, pas masquées — au prix d'une petite redondance pour un lecteur
 * d'écran sur la grille de cartes, où le nom est déjà écrit à côté.
 *
 * Formulation volontairement honnête : « Illustration d'un… ». Ce sont des
 * planches de référence dessinées, pas des photographies, et la fiche ne doit pas
 * laisser croire le contraire.
 */
export function speciesCoverAlt(slug: SpeciesSlug): string {
  const meta = SPECIES[slug]
  const article = meta.gender === 'f' ? "d'une" : "d'un"
  return `Illustration ${article} ${meta.labelLower} (${meta.latin})`
}
