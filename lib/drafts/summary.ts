import { SPECIES_LABELS } from '@/lib/labels'

/**
 * Rappel du brouillon en attente sur la page d'inscription (sprint 78, Bloc 1).
 *
 * LE PROBLÈME (audit QA du 14/08) : arrivé sur `/auth/register` avec 2 favoris et
 * une prise en attente, le visiteur lisait « Logue ta première prise en 2 minutes ».
 * On demandait de recommencer à quelqu'un qui VENAIT de le faire, et on remplaçait
 * l'aversion à la perte par une promesse générique au moment précis où l'aversion
 * est la plus forte. La thèse du Bloc 7 du sprint 77 est écrite noir sur blanc
 * (« l'aversion à la perte est beaucoup plus motrice qu'une promesse de bénéfice »)
 * et elle était appliquée partout SAUF sur la page qui décide.
 *
 * Fonction PURE : aucune lecture de cookie, aucune requête. Elle reçoit ce qui a
 * déjà été lu et validé, ce qui la rend testable sans navigateur ni base.
 */

export type DraftSummaryInput = {
  /** Espèce du brouillon de prise, telle que stockée en cookie. */
  species?: string | null
  /** Nom lisible du spot, si on a pu le résoudre. Jamais un slug. */
  spotName?: string | null
  /** Nombre de spots mis de côté. */
  favoritesCount?: number
}

/**
 * Renvoie la phrase de rappel, ou `null` s'il n'y a rien en attente — auquel cas
 * l'appelant garde la copie générique. On ne fabrique jamais une phrase vide du
 * genre « tes 0 spots t'attendent ».
 */
export function buildDraftSummary(input: DraftSummaryInput): string | null {
  const favorites = Math.max(0, input.favoritesCount ?? 0)
  const speciesLabel = input.species
    ? (SPECIES_LABELS[input.species] ?? input.species).toLowerCase()
    : null

  // Morceau « prise » : on nomme l'espèce, et le spot quand on le connaît.
  const catchPart = speciesLabel
    ? input.spotName
      ? `Ta prise de ${speciesLabel} à ${input.spotName}`
      : `Ta prise de ${speciesLabel}`
    : null

  // Morceau « favoris » : c'est le NOMBRE qui fait le poids. « 2 spots » est une
  // chose qu'on possède et qu'on peut perdre, « tes spots » est une abstraction.
  const favoritesPart =
    favorites > 0 ? `${favorites} spot${favorites > 1 ? 's' : ''} mis de côté` : null

  if (!catchPart && !favoritesPart) return null

  let subject: string
  if (catchPart && favoritesPart) {
    subject = `${catchPart} et tes ${favoritesPart}`
  } else if (catchPart) {
    subject = catchPart
  } else {
    // Majuscule en tête quand le morceau favoris ouvre la phrase.
    subject = `Tes ${favoritesPart}`
  }

  const verb = catchPart && favoritesPart ? 't’attendent' : favorites > 1 ? 't’attendent' : 't’attend'
  return `${subject} ${verb}. 30 secondes, sans carte bancaire.`
}
