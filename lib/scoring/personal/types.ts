// ─── Moteur perso descriptif — types ──────────────────────────────────────────
// UN seul moteur (sprint 22, Chantier A) qui remplace les 2 systèmes divergents
// (lib/scoring/{insights,patterns,...} + lib/catches/insights). Contrainte 7.5
// gravée : DESCRIPTIF (« où/quand tombent tes prises »), JAMAIS prédictif
// (« tu pêches mieux »). Aucun chiffre 0-100 perso. Toujours sampleCount + confiance.

export type TendencyFactor = 'hour' | 'weekday' | 'season' | 'wind' | 'tide'

export type Confidence = 'low' | 'medium' | 'high'

/** Échantillon perso minimal dérivé d'une prise (timezone Europe/Paris). */
export type CatchSample = {
  species: string | null
  spotId: string | null
  caughtAt: Date
  windSpeedKmh: number | null
  tideState: 'rising' | 'falling' | 'slack' | null
  hourLocal: number // 0-23, Europe/Paris
  monthLocal: number // 1-12
  weekdayLocal: number // 0 = dimanche … 6 = samedi
}

/**
 * Une tendance descriptive sur un facteur : le « bucket » dominant parmi TES
 * prises (ayant la donnée), sa part, et la taille d'échantillon. Aucun jugement
 * de performance : on décrit la distribution, on ne prédit rien.
 */
export type Tendency = {
  factor: TendencyFactor
  label: string | null // libellé du bucket dominant, ex. « le matin » (null si pas de donnée)
  count: number // prises dans le bucket dominant
  sampleCount: number // prises ayant cette donnée (dénominateur de `share`)
  share: number // count / sampleCount (0-1)
  confidence: Confidence
  hasData: boolean
}

/** Périmètre : segmentable par espèce et/ou par spot (réutilisé fiche espèce sprint 23). */
export type TendencyScope = {
  species?: string | null
  spotId?: string | null
}

export type PersonalTendencies = {
  species: string | null
  spotId: string | null
  sampleCount: number // prises dans le périmètre
  confidence: Confidence
  tendencies: Tendency[] // facteurs avec données, triés par part décroissante
  hasEnough: boolean // sampleCount >= seuil d'affichage
  minToUnlock: number // prises manquantes pour atteindre le seuil (état dégradé)
}
