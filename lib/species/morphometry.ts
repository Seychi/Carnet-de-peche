/**
 * Conversion taille → poids (estimation) par la relation longueur-poids
 * standard W = a · L^b, avec L = longueur totale en CENTIMÈTRES et W = poids en
 * GRAMMES. Sprint 45 « Le moat visible ».
 *
 * HONNÊTETÉ (invariant transverse) : c'est une ESTIMATION morphométrique, JAMAIS
 * une pesée. L'UI doit toujours afficher « estimé ». Quand le pêcheur a saisi un
 * poids réel, c'est lui qui prime ; l'estimation reste un complément discret.
 *
 * SOURCE DES COEFFICIENTS — FishBase (estimations bayésiennes « LWR estimates for
 * this species », en cm total length → poids en grammes). Chaque coefficient porte
 * sa source en commentaire. RIEN n'est inventé : une espèce sans valeur fiable et
 * sourcée n'est PAS couverte (aucune estimation affichée).
 *
 * NON COUVERTES VOLONTAIREMENT :
 *  - seiche (Sepia officinalis) et calmar (Loligo vulgaris) : céphalopodes. FishBase
 *    ne fournit pas de a/b en longueur totale (la mesure usuelle est la longueur du
 *    manteau, pas la longueur totale saisie au carnet) → ambiguïté de mesure, on
 *    s'abstient pour ne pas afficher un poids faux.
 */

/** Un coefficient longueur-poids sourcé. `a` et `b` calibrés pour cm (TL) → grammes. */
export type Morphometry = {
  /** Coefficient a de W = a·L^b (cm → g). */
  a: number
  /** Exposant b de W = a·L^b. */
  b: number
  /** Nom scientifique (espèce FishBase de référence). */
  scientific: string
  /** Source du couple a/b. */
  source: string
}

/**
 * Table des coefficients par clé DB (`catches.species`, snake_case). Valeurs =
 * estimations bayésiennes FishBase (longueur totale en cm → poids en g).
 *
 * Couvre 24 des 26 espèces du carnet (toutes sauf les 2 céphalopodes seiche/calmar,
 * cf en-tête). Les 6 espèces cœur d'abord, puis l'extension.
 */
export const MORPHOMETRY: Record<string, Morphometry> = {
  // ── Espèces cœur (les plus sûres) ──
  // FishBase, Dicentrarchus labrax (European seabass) : a=0.00933, b=3.02.
  bar: { a: 0.00933, b: 3.02, scientific: 'Dicentrarchus labrax', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Sparus aurata (gilthead seabream) : a=0.01202, b=3.02.
  dorade_royale: { a: 0.01202, b: 3.02, scientific: 'Sparus aurata', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Pollachius pollachius (pollack) : a=0.00692, b=3.08.
  lieu_jaune: { a: 0.00692, b: 3.08, scientific: 'Pollachius pollachius', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Scomber scombrus (Atlantic mackerel) : a=0.00631, b=3.07.
  maquereau: { a: 0.00631, b: 3.07, scientific: 'Scomber scombrus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Diplodus sargus (white seabream) : a=0.01202, b=3.04.
  sar: { a: 0.01202, b: 3.04, scientific: 'Diplodus sargus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Belone belone (garfish) : a=0.00100, b=3.10 (corps très allongé → a faible).
  orphie: { a: 0.001, b: 3.1, scientific: 'Belone belone', source: 'FishBase (Bayesian LWR, cm TL → g)' },

  // ── Extension (espèces du bord, sprint 23/29) ──
  // FishBase, Chelon labrosus (thicklip grey mullet) : a=0.00724, b=3.11.
  mulet: { a: 0.00724, b: 3.11, scientific: 'Chelon labrosus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Solea solea (common sole) : a=0.00724, b=3.07.
  sole: { a: 0.00724, b: 3.07, scientific: 'Solea solea', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Conger conger (European conger) : a=0.00042, b=3.28 (corps anguilliforme).
  congre: { a: 0.00042, b: 3.28, scientific: 'Conger conger', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Labrus bergylta (ballan wrasse) : a=0.00955, b=3.07.
  vieille: { a: 0.00955, b: 3.07, scientific: 'Labrus bergylta', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Mullus surmuletus (surmullet / striped red mullet) : a=0.00891, b=3.11.
  rouget: { a: 0.00891, b: 3.11, scientific: 'Mullus surmuletus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Spondyliosoma cantharus (black seabream) : a=0.01230, b=3.03.
  dorade_grise: { a: 0.0123, b: 3.03, scientific: 'Spondyliosoma cantharus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Pagellus erythrinus (common pandora) : a=0.01000, b=3.01.
  pageot: { a: 0.01, b: 3.01, scientific: 'Pagellus erythrinus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Oblada melanura (saddled seabream) : a=0.01148, b=3.03.
  oblade: { a: 0.01148, b: 3.03, scientific: 'Oblada melanura', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Argyrosomus regius (meagre) : a=0.00832, b=3.07.
  maigre: { a: 0.00832, b: 3.07, scientific: 'Argyrosomus regius', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Trisopterus luscus (pouting / bib) : a=0.00741, b=3.10.
  tacaud: { a: 0.00741, b: 3.1, scientific: 'Trisopterus luscus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Trachurus trachurus (Atlantic horse mackerel) : a=0.00813, b=2.97.
  chinchard: { a: 0.00813, b: 2.97, scientific: 'Trachurus trachurus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Pleuronectes platessa (European plaice) : a=0.00776, b=3.07.
  plie: { a: 0.00776, b: 3.07, scientific: 'Pleuronectes platessa', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Pomatomus saltatrix (bluefish) : a=0.01072, b=2.96.
  tassergal: { a: 0.01072, b: 2.96, scientific: 'Pomatomus saltatrix', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Lichia amia (leerfish) : a=0.01380, b=2.93.
  liche: { a: 0.0138, b: 2.93, scientific: 'Lichia amia', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Lithognathus mormyrus (striped seabream / sand steenbras) : a=0.01175, b=3.02.
  marbre: { a: 0.01175, b: 3.02, scientific: 'Lithognathus mormyrus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Pollachius virens (saithe) : a=0.00661, b=3.07.
  lieu_noir: { a: 0.00661, b: 3.07, scientific: 'Pollachius virens', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Merlangius merlangus (whiting) : a=0.00631, b=3.06.
  merlan: { a: 0.00631, b: 3.06, scientific: 'Merlangius merlangus', source: 'FishBase (Bayesian LWR, cm TL → g)' },
  // FishBase, Sphyraena viridensis (yellowmouth barracuda) : a=0.00708, b=2.92
  // (intervalle large, l'estimation reste indicative pour cette espèce).
  barracuda: { a: 0.00708, b: 2.92, scientific: 'Sphyraena viridensis', source: 'FishBase (Bayesian LWR, cm TL → g)' },
}

/**
 * Estime le poids (en GRAMMES) à partir de la longueur (en cm) pour une espèce
 * couverte. Renvoie `null` si l'espèce n'est pas couverte ou si la longueur est
 * invalide (≤ 0, non finie). Le résultat est arrondi au gramme.
 */
export function estimateWeightG(species: string | null | undefined, lengthCm: number | null | undefined): number | null {
  if (!species) return null
  const m = MORPHOMETRY[species]
  if (!m) return null
  if (lengthCm == null || !Number.isFinite(lengthCm) || lengthCm <= 0) return null
  return Math.round(m.a * Math.pow(lengthCm, m.b))
}
