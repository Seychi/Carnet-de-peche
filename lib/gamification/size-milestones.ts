// ─── Jalons de taille par espèce (Sprint 61, Bloc 1) ──────────────────────────
//
// Un « jalon » = le PROCHAIN CAP ROND au-dessus du record actuel de l'espèce. C'est
// de l'arithmétique, PAS un objectif fabriqué ni une promesse (« tu vas battre ») :
// on affiche seulement « record X cm · prochain jalon Y cm » avec une barre de
// progression DESCRIPTIVE. Zéro chiffre inventé (aucune taille max « officielle »
// affirmée), zéro comparaison inter-pêcheurs (c'est le record du pêcheur sur SON
// carnet, cf getMyRecordsBySpecies).
//
// Le PAS s'adapte à l'échelle du poisson pour que la barre reste lisible : 5 cm pour
// les petites espèces, 20 cm pour les très grosses (congre, maigre, liche), 10 cm par
// défaut au-delà de 50 cm. Ce choix de granularité d'AFFICHAGE n'affirme rien sur la
// biologie : c'est juste « le prochain multiple rond ».

/** Pas d'affichage (cm) par espèce quand la granularité par défaut est trop grossière. */
const STEP_BY_SPECIES: Record<string, number> = {
  // Petites espèces → pas fin de 5 cm
  maquereau: 5,
  sar: 5,
  orphie: 5,
  rouget: 5,
  oblade: 5,
  marbre: 5,
  pageot: 5,
  tacaud: 5,
  chinchard: 5,
  sole: 5,
  plie: 5,
  calmar: 5,
  seiche: 5,
  vieille: 5,
  dorade_grise: 5,
  merlan: 5,
  // Très grosses espèces → pas large de 20 cm
  congre: 20,
  maigre: 20,
  liche: 20,
}

/** Pas d'affichage pour une espèce à une taille donnée (défaut adaptatif à l'échelle). */
function stepFor(species: string, currentCm: number): number {
  return STEP_BY_SPECIES[species] ?? (currentCm < 50 ? 5 : 10)
}

/**
 * Prochain jalon (cm) strictement au-dessus du record actuel. `null` si la taille est
 * invalide (≤ 0 ou non finie). Toujours un multiple rond du pas de l'espèce.
 */
export function nextSizeMilestone(species: string, currentCm: number): number | null {
  if (!Number.isFinite(currentCm) || currentCm <= 0) return null
  const step = stepFor(species, currentCm)
  return Math.floor(currentCm / step) * step + step
}

export type MilestoneProgress = {
  /** Prochain cap rond (cm). */
  next: number
  /** Pas de la bande (cm). */
  step: number
  /** Remplissage de la barre [0, 1] = record / prochain jalon (descriptif). */
  ratio: number
}

/**
 * Progression descriptive vers le prochain jalon : la barre se remplit à `record / next`,
 * jamais une promesse (« tu vas battre »). `null` pour une taille invalide.
 */
export function milestoneProgress(species: string, currentCm: number): MilestoneProgress | null {
  const next = nextSizeMilestone(species, currentCm)
  if (next == null || next <= 0) return null
  const step = stepFor(species, currentCm)
  const ratio = Math.min(1, Math.max(0, currentCm / next))
  return { next, step, ratio }
}
