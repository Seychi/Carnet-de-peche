import type { Guide } from './loader'

// ─── Guides liés : la règle de priorité, écrite UNE fois (sprint 75, Bloc 4) ──
//
// LE BUG CORRIGÉ. Les fiches espèces et les fiches spots faisaient toutes deux :
//   guides.filter((g) => g.species === label || g.species === 'Multi-espèces').slice(0, 3)
// Un filtre sans tri, puis une coupe à 3 sur une liste ordonnée par date. Résultat :
// une espèce qui a des guides DÉDIÉS pouvait n'afficher que des guides génériques,
// simplement parce qu'ils étaient plus récents. La fiche spot allait jusqu'à
// documenter en commentaire (« espèces du spot d'abord, multi-espèces ensuite »)
// un comportement que le code ne faisait pas.
//
// Sur 6 guides dont 3 multi-espèces, le risque était concret : `/especes/bar` a deux
// guides dédiés et pouvait n'en montrer aucun.
//
// Pur → testable, aucune I/O.

export const MULTI_SPECIES_LABEL = 'Multi-espèces'

/**
 * Guides pertinents pour une ou plusieurs espèces, les DÉDIÉS d'abord, les
 * multi-espèces ensuite, en conservant l'ordre d'entrée (les guides arrivent déjà
 * triés du plus récent au plus ancien par `getAllGuides`).
 *
 * `speciesLabels` = libellés affichés (« Bar », « Dorade royale »), c'est la clé
 * réelle du frontmatter des guides, pas un slug.
 */
export function relatedGuidesFor(
  guides: readonly Guide[],
  speciesLabels: Iterable<string>,
  limit = 3,
): Guide[] {
  const wanted = new Set(speciesLabels)

  const dedies: Guide[] = []
  const generiques: Guide[] = []
  for (const g of guides) {
    if (wanted.has(g.species)) dedies.push(g)
    else if (g.species === MULTI_SPECIES_LABEL) generiques.push(g)
  }

  return [...dedies, ...generiques].slice(0, limit)
}
