import {
  getAllProgrammaticPages,
  DEPARTMENT_SLUGS,
  type SpeciesSlug,
} from '@/lib/seo/programmatic'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { TECHNIQUE_LABELS } from '@/lib/labels'

// Maillage fiche espèce → pages programmatiques /peche (sprint 75, Bloc 3).
//
// POURQUOI. /peche fait 7,3 % de CTR quand /especes plafonne à 1,7 %. Ces pages
// existent déjà et sont orphelines depuis les fiches : les lier envoie le volume
// d'impressions vers le format qui convertit.
//
// ⚠️ GARDE-FOU ANTI-404. Seules 6 espèces ont des pages programmatiques (matrice
// SPECIES_TECHNIQUES de lib/seo/programmatic, volontairement partielle : une espèce
// sans contenu programmatique n'a AUCUNE page). Et chaque espèce n'a de pages que
// sur les départements où elle est réellement pêchable (le lieu jaune n'existe pas
// en Méditerranée). On ne construit donc JAMAIS une URL à la main : on filtre la
// liste des pages réellement générées. Un lien mort coûte plus qu'un lien absent.

export type PecheLink = { href: string; label: string }

/**
 * Liens `/peche/<espèce>/<technique>/<département>` réellement existants pour cette
 * espèce, restreints aux départements passés en entrée (ceux où elle a des spots
 * publiés). Trié par département puis technique. `[]` si l'espèce n'a pas de pages
 * programmatiques, ce qui est le cas de 20 des 26 espèces.
 */
export function getPecheLinks(
  species: SpeciesSlug,
  deptCodes: string[],
  limit = 6,
): PecheLink[] {
  const wanted = new Set(deptCodes.map((d) => d.trim()))

  const pages = getAllProgrammaticPages().filter(
    (p) => p.species === species && p.deptCode !== null && wanted.has(p.deptCode),
  )

  const links = pages
    .map((p) => {
      const code = p.deptCode as string
      const deptSlug = DEPARTMENT_SLUGS[code]
      // Département sans slug d'URL : la page n'existe pas, on n'invente rien.
      if (!deptSlug) return null
      const technique = TECHNIQUE_LABELS[p.technique] ?? p.technique
      const dept = DEPARTMENT_LABELS[code] ?? code
      return {
        href: `/peche/${p.species}/${p.technique}/${deptSlug}`,
        label: `${technique} ${dept}`,
        sortKey: `${dept}-${technique}`,
      }
    })
    .filter((l): l is PecheLink & { sortKey: string } => l !== null)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  return links.slice(0, limit).map(({ href, label }) => ({ href, label }))
}
