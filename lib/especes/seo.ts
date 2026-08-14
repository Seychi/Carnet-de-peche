import type { Facade, SpeciesMeta } from '@/lib/seo/programmatic'
import type { EspeceContent } from './types'
import { currentSeason, seasonRow, type SaisonRow } from './season'

// ═══════════════════════════════════════════════════════════════════════════════
// TITLES & META DESCRIPTIONS des fiches espèces (sprint 75, Bloc 4).
//
// Constat GSC 90 j : /especes = 36 % des impressions du site pour 11 % des clics
// (CTR 1,7 %). Deux intentions se mélangeaient dans un seul title générique :
//   1. « c'est quoi ce poisson » (congre, barracuda, liche…) : position 2-3, CTR 0 %,
//      la réponse est déjà servie par les AI Overviews de Google.
//   2. « où / comment le pêcher » (surfcasting morbihan, leurre lieu jaune…) : ça clique.
// DÉCISION VERROUILLÉE : on ne se bat PAS pour les requêtes-définitions. Le title et
// la description portent l'intention pêche + la donnée actionnable (la maille), qui
// est aussi ce que les gens tapent (« maille du maigre 2026 », « bar maille »).
//
// Ces fonctions sont PURES : elles ne font que FORMATER `SpeciesMeta` + `EspeceContent`.
// Aucune maille, aucun quota, aucune date n'est inventé ici. Si une donnée manque
// (espèce non listée à l'arrêté → `minSizeCm` à null), on dégrade proprement vers
// l'intention pêche, jamais vers « undefined » ni vers une affirmation non sourcée.
// ═══════════════════════════════════════════════════════════════════════════════

/** Longueur cible du <title> avant troncature SERP (Google coupe vers 60-65 car.). */
export const TITLE_MAX_LENGTH = 60
/** Longueur cible de la meta description (Google coupe vers 155-160 car.). */
export const DESCRIPTION_MAX_LENGTH = 155

/**
 * Suffixe de marque. Ajouté SEULEMENT s'il rentre dans le budget (même règle que
 * les titres espèces d'avant sprint 75) : le nom du site ne vaut jamais la
 * troncature de la donnée utile. Séparateur « · », pas de tiret cadratin (CLAUDE.md §6).
 */
const BRAND_SUFFIX = ' · Carnet de Pêche'

const FACADES: readonly Facade[] = ['manche-atlantique', 'mediterranee']

const FACADE_IN: Record<Facade, string> = {
  'manche-atlantique': 'en Manche et Atlantique',
  mediterranee: 'en Méditerranée',
}

/** « Au printemps » mais « En été » : préposition explicite, pas d'heuristique. */
const SEASON_PREPOSITION: Record<string, string> = {
  Printemps: 'Au printemps',
  Été: 'En été',
  Automne: 'En automne',
  Hiver: 'En hiver',
}

/** Même vocabulaire que les pastilles d'activité de la fiche (1 calme → 3 pleine saison). */
const ACTIVITY_PHRASE: Record<1 | 2 | 3, string> = {
  1: "l'activité est calme",
  2: "l'activité est bonne",
  3: "c'est la pleine saison",
}

export type SpeciesSeoInput = {
  /** Référentiel espèces (label, articles) : `SPECIES[slug]` de lib/seo/programmatic. */
  meta: SpeciesMeta
  /** Contenu éditorial sourcé : `ESPECES_CONTENT[slug]` de lib/especes/content. */
  content: EspeceContent
  /** Injectable pour les tests ; sinon la date courante (la fiche est en ISR 24 h). */
  now?: Date
}

type MailleEntry = { facade: Facade; cm: number }

/** Façades où une taille minimale EXISTE dans la donnée (null = espèce non listée). */
function mailleEntries(minSizeCm: Record<Facade, number | null>): MailleEntry[] {
  return FACADES.map((facade) => ({ facade, cm: minSizeCm[facade] })).filter(
    (e): e is MailleEntry => typeof e.cm === 'number' && Number.isFinite(e.cm),
  )
}

/**
 * Maille en version courte pour le <title> : « 42 cm » si une seule valeur ou si les
 * deux façades sont alignées, « 45 à 50 cm » quand elles diffèrent (le détail par
 * façade est dans la description et dans le bloc réglementation de la fiche).
 * null = aucune maille dans la donnée.
 */
export function formatMailleShort(minSizeCm: Record<Facade, number | null>): string | null {
  const entries = mailleEntries(minSizeCm)
  if (entries.length === 0) return null
  const values = entries.map((e) => e.cm)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max ? `${min} cm` : `${min} à ${max} cm`
}

/** Année de la date de vérification (« 23/06/2026 » → « 2026 »), null si illisible. */
function verifiedYear(verifiedAt: string): string | null {
  const match = /(\d{4})\s*$/.exec(verifiedAt.trim())
  return match ? match[1] : null
}

/** Première variante qui tient dans le budget ; à défaut la plus courte (dernière). */
function firstFitting(candidates: string[], max: number): string {
  return candidates.find((c) => c.length <= max) ?? candidates[candidates.length - 1]
}

/**
 * <title> de fiche espèce. Construction par dégradation : on garde d'abord la donnée
 * actionnable (maille), puis l'intention pêche (saisons et spots), puis l'année de
 * vérification, et la marque en dernier. Reste sous TITLE_MAX_LENGTH.
 *
 * Exemples : « Bar : maille 42 cm (2026), saisons et spots du bord »
 *            « Barracuda : pêche du bord, saisons, techniques et spots » (pas de maille).
 */
export function buildSpeciesTitle({ meta, content }: SpeciesSeoInput): string {
  // Sprint 77, Bloc 9 : override manuel pour les fiches à intention d'identification
  // (cf `EspeceContent.seoTitle`). La formule ci-dessous reste la valeur par défaut
  // des 23 autres espèces.
  if (content.seoTitle) return content.seoTitle
  const maille = formatMailleShort(content.regulation.minSizeCm)
  const answer = maille ? `maille ${maille}` : 'pêche du bord'
  // L'année n'a de sens qu'accolée à un chiffre réglementaire (« maille du maigre 2026 »).
  const year = maille ? verifiedYear(content.regulation.verifiedAt) : null
  const yearPart = year ? ` (${year})` : ''
  const tail = maille ? ', saisons et spots du bord' : ', saisons, techniques et spots'
  const base = `${meta.label} : ${answer}`

  return firstFitting(
    [
      `${base}${yearPart}${tail}${BRAND_SUFFIX}`,
      `${base}${yearPart}${tail}`,
      `${base}${tail}`,
      `${base}${yearPart}`,
      `${base}${BRAND_SUFFIX}`,
      base,
    ],
    TITLE_MAX_LENGTH,
  )
}

/** Phrase d'ouverture : la maille par façade, ou un repli honnête si l'espèce n'en a pas. */
function openingSentence(meta: SpeciesMeta, content: EspeceContent): string {
  const de = `${meta.articleDe}${meta.labelLower}`
  const entries = mailleEntries(content.regulation.minSizeCm)

  // Aucune maille dans la donnée : on ne conclut RIEN à la place de l'arrêté (le détail
  // sourcé est dans regulation.items, lu sur la fiche), on promet la page.
  if (entries.length === 0) {
    return `Pêche ${de} du bord : réglementation vérifiée le ${content.regulation.verifiedAt}, saisons et spots publiés.`
  }
  if (entries.length === 2 && entries[0].cm === entries[1].cm) {
    return `Maille ${de} : ${entries[0].cm} cm sur les deux façades.`
  }
  return `Maille ${de} : ${entries.map((e) => `${e.cm} cm ${FACADE_IN[e.facade]}`).join(', ')}.`
}

/**
 * Saison EN COURS, dérivée des saisons éditoriales (activité 1-3 par façade), jamais
 * d'un solunar générique. Si les deux façades ne disent pas la même chose, on nomme la
 * façade la plus active plutôt que de généraliser. Chaîne vide = rien d'assertable.
 */
function seasonSentence(content: EspeceContent, now: Date): string {
  const season = currentSeason(now)
  const preposition = SEASON_PREPOSITION[season]
  if (!preposition) return ''

  const rows = FACADES.map((facade) => ({
    facade,
    row: seasonRow(content.saisons[facade] ?? [], season),
  })).filter((x): x is { facade: Facade; row: SaisonRow } => x.row !== null)
  if (rows.length === 0) return ''

  const best = rows.reduce((a, b) => (b.row.activite > a.row.activite ? b : a))
  const phrase = ACTIVITY_PHRASE[best.row.activite]
  const uniform = rows.every((r) => r.row.activite === best.row.activite)
  return uniform
    ? ` ${preposition}, ${phrase}.`
    : ` ${preposition}, ${phrase} ${FACADE_IN[best.facade]}.`
}

/**
 * Meta description de fiche espèce : elle PROMET la réponse concrète (maille par façade,
 * marquage, saison en cours) au lieu de décrire le site. Même dégradation que le title :
 * on coupe la queue générique avant la donnée. Reste sous DESCRIPTION_MAX_LENGTH.
 *
 * Exemple : « Maille du maigre : 50 cm en Manche et Atlantique, 45 cm en Méditerranée.
 *            Marquage obligatoire. En été, c'est la pleine saison. »
 */
export function buildSpeciesDescription({ meta, content, now }: SpeciesSeoInput): string {
  const opening = openingSentence(meta, content)
  const marquage = content.regulation.marquage ? ' Marquage obligatoire.' : ''
  const season = seasonSentence(content, now ?? new Date())
  const tail = ' Techniques, postes et spots du bord.'

  return firstFitting(
    [
      `${opening}${marquage}${season}${tail}`,
      `${opening}${marquage}${season}`,
      `${opening}${season}${tail}`,
      `${opening}${season}`,
      `${opening}${marquage}`,
      opening,
    ],
    DESCRIPTION_MAX_LENGTH,
  )
}
