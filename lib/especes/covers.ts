// GÉNÉRÉ par scripts/build-species-images.mjs — ne pas éditer à la main.
// Relancer `pnpm species:images` après chaque lot de planches générées.
//
// `satisfies` fait échouer `pnpm typecheck` si un slug de planche sortait du
// référentiel SPECIES : un renommage d’espèce ne peut pas laisser une carte
// pointer dans le vide sans que la CI le dise.
import type { SpeciesSlug } from '@/lib/seo/programmatic'

export const SPECIES_COVERS = {
  barracuda: '/images/especes/barracuda.webp',
  calmar: '/images/especes/calmar.webp',
  chinchard: '/images/especes/chinchard.webp',
  'dorade-grise': '/images/especes/dorade-grise.webp',
  liche: '/images/especes/liche.webp',
  'lieu-jaune': '/images/especes/lieu-jaune.webp',
  'lieu-noir': '/images/especes/lieu-noir.webp',
  maquereau: '/images/especes/maquereau.webp',
  marbre: '/images/especes/marbre.webp',
  merlan: '/images/especes/merlan.webp',
  mulet: '/images/especes/mulet.webp',
  oblade: '/images/especes/oblade.webp',
  orphie: '/images/especes/orphie.webp',
  pageot: '/images/especes/pageot.webp',
  plie: '/images/especes/plie.webp',
  rouget: '/images/especes/rouget.webp',
  sar: '/images/especes/sar.webp',
  seiche: '/images/especes/seiche.webp',
  sole: '/images/especes/sole.webp',
  tacaud: '/images/especes/tacaud.webp',
  tassergal: '/images/especes/tassergal.webp',
  vieille: '/images/especes/vieille.webp',
  bar: '/images/especes/bar.webp',
  congre: '/images/especes/congre.webp',
  'dorade-royale': '/images/especes/dorade-royale.webp',
  maigre: '/images/especes/maigre.webp',
} as const satisfies Partial<Record<SpeciesSlug, string>>

/** Chemin de la planche de l’espèce, ou null si elle n’a pas encore été générée. */
export function speciesCover(slug: SpeciesSlug): string | null {
  return (SPECIES_COVERS as Partial<Record<SpeciesSlug, string>>)[slug] ?? null
}
