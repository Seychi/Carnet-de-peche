// Adéquation espèce ↔ nature du fond (composante « donnée » de la couche Qualité,
// Carte v2 / C3b). On combine ici :
//   • la donnée MESURÉE au point (profondeur + substrat EMODnet, via C3a) ;
//   • une règle d'habitat ÉDITORIALE, indicative, fondée sur la connaissance halieutique
//     courante (où tient telle espèce du bord). C'est un repère, PAS une mesure —
//     l'UI l'affiche comme « indicatif ». On ne fabrique aucune donnée : si le fond
//     est inconnu au point, le verdict est « inconnu » (cf garde-fou honnêteté 7.5).
//
// La règle ne « note » pas l'espèce dans l'absolu ; elle dit seulement si le fond
// MESURÉ correspond au type de poste que l'espèce fréquente. Les espèces de pleine
// eau (maquereau, orphie, chinchard) sont peu déterminées par le fond → on le dit.

import type { SeabedInfo } from '@/lib/conditions/bathymetry'

export type SubstrateCategory = 'rock' | 'coarse' | 'sand' | 'mixed' | 'mud' | 'seagrass' | 'unknown'

// Mappe une classe substrat EMODnet (champ `raw`, ex. « Rock or other hard substrata »,
// « Muddy sand », « Sandy mud », « Coarse substrate », « Mixed sediment »,
// « [Posidonia oceanica] meadows ») vers une catégorie large. Priorité herbier >
// maërl(grossier) > roche > grossier > mixte > sable > vase. Catégories
// VOLONTAIREMENT larges : on reste indicatif, pas de fausse précision.
export function substrateCategory(raw: string | null | undefined): SubstrateCategory {
  if (!raw) return 'unknown'
  const s = raw.toLowerCase()
  // Herbiers (posidonie, zostère, cymodocée…) = habitat structuré très poissonneux.
  if (s.includes('posidonia') || s.includes('seagrass') || s.includes('zostera') || s.includes('cymodocea')) return 'seagrass'
  if (s.includes('maerl') || s.includes('maërl')) return 'coarse' // maërl = fond grossier calcaire
  if (s.includes('rock')) return 'rock'
  if (s.includes('coarse')) return 'coarse'
  if (s.includes('mixed')) return 'mixed'
  if (s.includes('sand')) return 'sand'
  if (s.includes('mud')) return 'mud'
  return 'unknown'
}

export type SpeciesHabitat = {
  /** Espèce de pleine eau → le type de fond est peu déterminant. */
  pelagic: boolean
  /** Substrats où l'espèce tient préférentiellement (du bord). */
  goodSubstrates: SubstrateCategory[]
  /** Fourchette de profondeur indicative du bord (m). */
  depthRange?: [number, number]
  /** Une phrase éditoriale, honnête et indicative. */
  note: string
}

// Connaissance halieutique courante (pêche du bord, France). Indicatif.
// Couvre les 6 espèces cœur + les espèces additionnelles portées par les spots curés.
export const SPECIES_HABITAT: Record<string, SpeciesHabitat> = {
  bar:           { pelagic: false, goodSubstrates: ['rock', 'coarse', 'mixed', 'seagrass'], depthRange: [0, 25], note: 'chasse sur la structure, la roche et les herbiers' },
  dorade_royale: { pelagic: false, goodSubstrates: ['sand', 'coarse', 'mud', 'seagrass'],  depthRange: [2, 20], note: 'fouille le sable et les fonds coquilliers' },
  lieu_jaune:    { pelagic: false, goodSubstrates: ['rock', 'coarse'],          depthRange: [3, 30], note: 'tient les tombants rocheux et les épaves' },
  maquereau:     { pelagic: true,  goodSubstrates: [],                          note: 'chasse en pleine eau, en banc' },
  sar:           { pelagic: false, goodSubstrates: ['rock', 'coarse', 'seagrass'], depthRange: [1, 20], note: 'fréquente les enrochements, la roche et les herbiers' },
  orphie:        { pelagic: true,  goodSubstrates: [],                          note: 'nage en surface, en pleine eau' },
  vieille:       { pelagic: false, goodSubstrates: ['rock', 'coarse'],          depthRange: [1, 25], note: 'strictement liée à la roche' },
  mulet:         { pelagic: false, goodSubstrates: ['sand', 'mud', 'mixed', 'seagrass'], depthRange: [0, 12], note: 'fonds meubles des ports et estuaires' },
  sole:          { pelagic: false, goodSubstrates: ['sand', 'mud', 'seagrass'], depthRange: [2, 30], note: 'poisson plat des fonds de sable et de vase' },
  congre:        { pelagic: false, goodSubstrates: ['rock', 'coarse'],          depthRange: [3, 40], note: 'se cache dans la roche, les épaves et les enrochements' },
  maigre:        { pelagic: false, goodSubstrates: ['sand', 'mud'],             depthRange: [3, 40], note: 'estuaires et grands fonds sableux' },
  chinchard:     { pelagic: true,  goodSubstrates: [],                          note: 'chasse en pleine eau, en banc' },
  // Sprint 23 — espèces ajoutées au référentiel (habitat indicatif, halieutique courante).
  seiche:        { pelagic: false, goodSubstrates: ['sand', 'seagrass', 'coarse', 'mixed'], depthRange: [1, 30], note: 'chasse sur le sable et les herbiers, le long de la roche' },
  calmar:        { pelagic: false, goodSubstrates: ['sand', 'coarse', 'mixed', 'seagrass'], depthRange: [3, 40], note: 'rôde au-dessus du sable et des structures, surtout de nuit' },
  rouget:        { pelagic: false, goodSubstrates: ['sand', 'coarse', 'mud', 'mixed'], depthRange: [2, 35], note: 'fouille le sable et le gravier de ses barbillons' },
  dorade_grise:  { pelagic: false, goodSubstrates: ['rock', 'coarse', 'mixed', 'seagrass'], depthRange: [3, 35], note: 'tient les fonds rocheux et coquilliers, souvent en banc' },
  pageot:        { pelagic: false, goodSubstrates: ['sand', 'coarse', 'mixed'], depthRange: [5, 40], note: 'fréquente le sable, le gravier et le coralligène' },
  oblade:        { pelagic: false, goodSubstrates: ['rock', 'coarse', 'seagrass'], depthRange: [1, 20], note: 'longe la roche et les herbiers, souvent entre deux eaux' },
  tacaud:        { pelagic: false, goodSubstrates: ['rock', 'coarse', 'mixed', 'sand'], depthRange: [3, 40], note: 'se serre près des structures, épaves et roche, en banc' },
  plie:          { pelagic: false, goodSubstrates: ['sand', 'mud', 'mixed'],    depthRange: [2, 40], note: 'poisson plat des fonds de sable et de vase' },
}

export type SuitabilityVerdict = 'favorable' | 'moyen' | 'peu' | 'pelagique' | 'inconnu'

export type SuitabilityAssessment = {
  verdict: SuitabilityVerdict
  /** Libellé court prêt à afficher (ex. « Fond favorable »). */
  label: string
  /** Explication honnête : faits MESURÉS (substrat/profondeur) + note d'habitat. */
  detail: string
  category: SubstrateCategory
}

const FR_CATEGORY: Record<SubstrateCategory, string> = {
  rock: 'roche', coarse: 'sédiment grossier', sand: 'sable',
  mixed: 'sédiment mixte', mud: 'vase', seagrass: 'herbier', unknown: 'fond indéterminé',
}

function fmtDepth(m: number): string {
  return (Math.round(m * 10) / 10).toFixed(1).replace('.', ',')
}

/**
 * Évalue l'adéquation du fond MESURÉ (EMODnet) à l'espèce. Pur (testable).
 * Renvoie null si aucune espèce n'est sélectionnée (la couche est « toutes espèces »).
 * Verdict « inconnu » si le fond n'est pas couvert au point — JAMAIS d'invention.
 */
export function assessSuitability(
  species: string | null | undefined,
  seabed: SeabedInfo,
): SuitabilityAssessment | null {
  if (!species) return null

  const habitat = SPECIES_HABITAT[species]
  const cat = substrateCategory(seabed.substrate?.raw)
  const depthM = seabed.depth?.depth_m
  const depthTxt = typeof depthM === 'number' ? `≈ ${fmtDepth(depthM)} m` : null

  // Espèce hors référentiel → on n'invente pas de verdict.
  if (!habitat) {
    return {
      verdict: 'inconnu',
      label: 'Adéquation inconnue',
      detail: 'Espèce hors de notre référentiel d’habitat — on ne se prononce pas.',
      category: cat,
    }
  }

  // Pleine eau : le fond est peu déterminant → on l'annonce honnêtement.
  if (habitat.pelagic) {
    const d = depthTxt ? ` (fond ${depthTxt})` : ''
    return {
      verdict: 'pelagique',
      label: 'Espèce de pleine eau',
      detail: `${capitalize(speciesShort(species))} ${habitat.note} — le type de fond est peu déterminant${d}.`,
      category: cat,
    }
  }

  // Aucun fond mesuré au point → honnête : inconnu.
  if (cat === 'unknown' && !depthTxt) {
    return {
      verdict: 'inconnu',
      label: 'Fond inconnu ici',
      detail: 'Pas de donnée de fond à ce point (hors couverture EMODnet).',
      category: cat,
    }
  }

  const substrateFavorable = habitat.goodSubstrates.includes(cat)
  const substrateNeutral = cat === 'mixed' || cat === 'coarse'

  // Profondeur dans la fourchette indicative ?
  let depthOk: boolean | null = null
  if (habitat.depthRange && typeof depthM === 'number') {
    depthOk = depthM >= habitat.depthRange[0] && depthM <= habitat.depthRange[1]
  }

  let verdict: SuitabilityVerdict
  if (cat === 'unknown') {
    // Substrat inconnu mais profondeur connue → on reste prudent.
    verdict = depthOk === false ? 'peu' : 'moyen'
  } else if (substrateFavorable) {
    verdict = depthOk === false ? 'moyen' : 'favorable'
  } else if (substrateNeutral) {
    verdict = 'moyen'
  } else {
    verdict = 'peu'
  }

  const label =
    verdict === 'favorable' ? 'Fond favorable' :
    verdict === 'moyen' ? 'Fond moyen' : 'Fond peu favorable'

  // Détail = faits mesurés + note d'habitat (jamais de chiffre inventé).
  const catFr = cat === 'unknown' ? null : FR_CATEGORY[cat]
  const measured =
    catFr && depthTxt ? `${capitalize(catFr)} à ${depthTxt}` :
    catFr ? capitalize(catFr) :
    depthTxt ? `Profondeur ${depthTxt}` : 'Fond partiellement connu'
  const detail = `${measured} — le ${speciesShort(species)} ${habitat.note}.`

  return { verdict, label, detail, category: cat }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Nom court sans article pour insérer dans une phrase (« le bar », « la dorade »).
function speciesShort(species: string): string {
  const map: Record<string, string> = {
    bar: 'bar', dorade_royale: 'dorade royale', lieu_jaune: 'lieu jaune',
    maquereau: 'maquereau', sar: 'sar', orphie: 'orphie', vieille: 'vieille',
    mulet: 'mulet', sole: 'sole', congre: 'congre', maigre: 'maigre', chinchard: 'chinchard',
    seiche: 'seiche', calmar: 'calmar', rouget: 'rouget', dorade_grise: 'dorade grise',
    pageot: 'pageot', oblade: 'oblade', tacaud: 'tacaud', plie: 'plie',
  }
  return map[species] ?? species
}
