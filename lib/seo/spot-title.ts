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
// des spots publiés (416 au sprint 76, 607 depuis le lot S78-MED-01) sans monter
// tout un Server Component. Même parti que lib/especes/seo.ts.
//
// ⚠️ Il doit rester PUR : aucun import serveur, sinon les tests basculent hors de
// l'environnement `node`. C'est pour ça que le périmètre de l'A/B du sprint 83
// se lit dans lib/conditions/tide-departments.ts et pas dans tide-calibration.ts.

import { isCalibratedTideDepartment } from '@/lib/conditions/tide-departments'

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

// ─── Sprint 83, Bloc 1 : A/B « la marée dans le titre » ───────────────────────
//
// Hypothèse mesurée : les gens cherchent la marée PAR NOM DE SPOT (« maree pen
// lan » : 29 impressions position 10,2, zéro clic ; « marée rostiviec » : 25
// impressions position 8,8, zéro clic). Le mot « marée » n'existait que dans la
// meta description, jamais dans le <title>.
//
// C'est une hypothèse, donc on la TESTE : deux cohortes de spots comparables,
// mêmes départements, même période, seule la formule du titre change. Verdict à
// J+21, pas avant. Voir docs/sprint-83/AB-MAREE.md pour les listes figées.

/**
 * Queues de la variante B, de la plus riche à la plus courte. La dégradation ne
 * coupe jamais un mot : elle change de palier.
 *
 * Coût fixe d'un palier = longueur du nom + ` (XX) : ` (8 caractères) + queue,
 * soit un budget de nom de 22 / 30 / 39 / 47 caractères selon le palier.
 */
const TIDE_TITLE_TAILS = [
  'marée du jour et spot de pêche',
  'marée et spot de pêche',
  'marée du jour',
  // Dernier recours : 4 spots réels sur 336 y tombent, tous à nom très long et
  // SANS tiret cadratin (« Grande jetée de Saint-Gilles-Croix-de-Vie », les trois
  // « Phare de X : Y » des Côtes-d'Armor). Pour eux le nom court vaut le nom
  // complet, donc aucun palier plus riche ne peut tenir. On garde le mot-clé
  // plutôt que de couper le nom.
  'marée',
] as const

/**
 * Titre variante B : « {nom} ({dept}) : marée du jour et spot de pêche ».
 * Pas de « Pêche à » en tête, pas de liste d'espèces : c'est justement la
 * variable testée.
 *
 * Ordre de dégradation : on épuise TOUTES les queues sur le nom COMPLET avant de
 * retomber sur le nom court. Deux raisons mesurées :
 *  - l'intention testée est « marée <nom de lieu> », et le lieu cherché est
 *    souvent le SUFFIXE du nom (« Pen Lan », « phare de Gatteville ») : couper au
 *    cadratin le ferait disparaître du titre ;
 *  - les points d'une même commune ne se distinguent QUE par ce suffixe, et la
 *    variante B n'a pas de liste d'espèces pour les départager. Couper d'abord
 *    produirait des <title> en doublon. Vérifié : 0 doublon sur les 336 spots.
 */
export function buildSpotTitleTide(spotName: string, deptKey: string): string {
  const candidates: string[] = []
  for (const base of [fullSpotName(spotName), shortSpotName(spotName)]) {
    for (const tail of TIDE_TITLE_TAILS) {
      candidates.push(`${base} (${deptKey}) : ${tail}`)
    }
  }
  return (
    candidates.find((c) => c.length <= SPOT_TITLE_MAX) ??
    candidates[candidates.length - 1]
  )
}

/**
 * Hash déterministe d'un slug, 32 bits. Même construction que le `slugHash` de
 * la fiche spot (FNV-1a) SUIVIE du finaliseur murmur3, qui n'est pas cosmétique :
 *
 * FNV-1a termine par une multiplication par un nombre IMPAIR, donc son bit 0 vaut
 * exactement la parité du XOR des bits de poids faible de tous les caractères. Or
 * `% 2` ne lit que ce bit-là. Sans finaliseur, la cohorte d'un spot serait une
 * simple parité de son slug, une propriété que le nommage peut corréler (tous les
 * « …-plage » d'un même lot tomberaient du même côté). Le finaliseur diffuse les
 * bits hauts vers le bit 0 et rend l'affectation insensible à ces motifs.
 *
 * Pure et stable : deux rendus du même slug donnent la même cohorte, sur toutes
 * les machines et après n'importe quelle revalidation. Google ne doit jamais voir
 * un titre danser d'une visite à l'autre. Ajouter des spots plus tard ne déplace
 * aucune affectation existante.
 */
export function slugCohortHash(slug: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

export type SpotTitleCohort = 'A' | 'B'

/**
 * Cohorte d'un spot pour l'A/B du sprint 83.
 *
 * Hors des 15 départements à marée calibrée (Méditerranée, Corse, et tout
 * département non côtier), c'est TOUJOURS 'A' : promettre « la marée du jour »
 * là où le marnage est négligeable et non audité serait une promesse creuse,
 * exactement ce que `isLowTidalRangeDepartment` sert à éviter sur la fiche.
 *
 * ⚠️ `spots.department` est en `char(3)` : la valeur arrive complétée par des
 * espaces. Le trim est fait dans `isCalibratedTideDepartment`.
 */
export function spotTitleCohort(slug: string, department: string): SpotTitleCohort {
  if (!isCalibratedTideDepartment(department)) return 'A'
  return slugCohortHash(slug) % 2 === 1 ? 'B' : 'A'
}

/**
 * Point d'entrée unique de `generateMetadata` : choisit la cohorte et construit
 * le titre correspondant. Renvoie aussi la cohorte, pour pouvoir l'étiqueter
 * ailleurs sans redupliquer la règle.
 */
export function buildSpotTitleAB(input: {
  slug: string
  name: string
  department: string
  speciesLabels: string[]
}): { title: string; cohort: SpotTitleCohort } {
  const deptKey = String(input.department).trim()
  const cohort = spotTitleCohort(input.slug, deptKey)
  const title =
    cohort === 'B'
      ? buildSpotTitleTide(input.name, deptKey)
      : buildSpotTitle(input.name, deptKey, input.speciesLabels)
  return { title, cohort }
}
