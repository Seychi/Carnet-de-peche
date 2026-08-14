// Titres SERP des fiches de spots (sprint 76, Bloc 5).
//
// Les titres servis faisaient 66 à 90 caractères quand Google coupe autour de 60,
// et la liste d'espèces — ce qui déclenche le clic — passait à la trappe :
//
//   « Pêche à Sausset-les-Pins — digues du port (13) — Dorade royale, Sar, Bar · Carnet de Pêche »  (90)
//
// Deux causes cumulées : le gabarit ajoutait un tiret cadratin ET `spot.name` en
// contient déjà un pour les spots à précision, d'où le double tiret, contraire à
// CLAUDE.md §6 qui n'en tolère qu'un comme séparateur de <title>.
//
// Le module vit ici (et pas dans la page) pour être testé sur la donnée réelle
// des 416 spots sans monter tout un Server Component. Même parti que lib/especes/seo.ts.

/** Longueur au-delà de laquelle Google tronque le titre dans le SERP. */
export const SPOT_TITLE_MAX = 60

/**
 * Nom court d'un spot : tout ce qui précède le premier tiret cadratin.
 * « Sausset-les-Pins — digues du port » → « Sausset-les-Pins ».
 * Un nom sans tiret est renvoyé tel quel. Ne coupe JAMAIS au milieu d'un mot.
 */
export function shortSpotName(name: string): string {
  const head = name.split('—')[0]?.trim()
  return head && head.length > 0 ? head : name.trim()
}

/**
 * Nom complet, tiret cadratin remplacé par une virgule.
 * « Antibes — digue du Port Vauban » → « Antibes, digue du Port Vauban ».
 * CLAUDE.md §6 : le cadratin ne survit pas dans une chaîne visible, et le
 * gabarit en pose déjà un comme séparateur de titre.
 */
function fullSpotName(name: string): string {
  return name
    .split('—')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * Titre d'une fiche de spot : « Pêche à {commune} ({dept}) : {espèces} ».
 * Sans suffixe de marque, sans tiret cadratin.
 *
 * Dégradation pure, jamais de troncature au milieu d'un mot. On garde le nom
 * COMPLET tant qu'il tient, et on ne retombe sur le nom court qu'ensuite :
 * couper systématiquement au cadratin ferait converger vers le même titre les
 * spots d'une même commune (« Le Grau-du-Roi » en porte 4), et un doublon de
 * <title> coûte plus cher que quelques caractères de plus.
 *
 * Ordre : nom complet + 2 espèces → +1 → seul → nom court + 2 → +1 → seul.
 */
export function buildSpotTitle(
  spotName: string,
  deptKey: string,
  speciesLabels: string[],
): string {
  const bases = [fullSpotName(spotName), shortSpotName(spotName)].map(
    (name) => `Pêche à ${name} (${deptKey})`,
  )
  // Le nom COMPLET passe avant la liste d'espèces : mesuré sur les 416 spots,
  // l'ordre inverse (espèces d'abord) fait converger 2 groupes de spots vers un
  // <title> identique, alors que celui-ci n'en produit aucun. Un doublon de
  // titre coûte plus cher qu'une espèce en moins, et seuls 7 spots sur 416
  // finissent sans liste d'espèces.
  const candidates: string[] = []
  for (const base of bases) {
    for (const count of [2, 1]) {
      const list = speciesLabels.slice(0, count).join(', ')
      if (list) candidates.push(`${base} : ${list}`)
    }
    candidates.push(base)
  }
  return (
    candidates.find((c) => c.length <= SPOT_TITLE_MAX) ??
    // Nom de commune à lui seul plus long que la limite : on sert le socle court
    // tel quel plutôt que de couper un mot en deux.
    candidates[candidates.length - 1]
  )
}
