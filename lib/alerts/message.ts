// ─── Copie des alertes par port (sprint 72) ────────────────────────────────────
// PUR (aucune I/O). Français, TUTOIEMENT, jamais de tiret cadratin (CLAUDE.md §6),
// JAMAIS de coordonnée (le spot n'est cité que par son nom), JAMAIS un chiffre qui
// ne vienne pas des paramètres :
//  - mode perso : les comptes viennent des tendances S22 (count / sampleCount réels),
//    les faits (marée, vent, marnage) viennent des mesures de la fenêtre ;
//  - mode générique : label EXPLICITE « alerte générique », le seul chiffre cité est
//    le vrai coef (si un jour disponible) ou le marnage MESURÉ. Aucun pourcentage.
//
// La formulation reste DESCRIPTIVE (héritage contrainte 7.5) : « N de tes M prises
// renseignées tombent … », jamais « tu prendras » / « réussite garantie ».

import type {
  AlertMessage,
  BigTideAlertPayload,
  JustificationInput,
  MatchedTendency,
  SpotAlertPayload,
  TideDirection,
} from './types'

// ─── Petits formatteurs (FR) ───────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

/** Décimale française à 1 chiffre : 5.42 → « 5,4 ». */
function frDecimal1(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

const TIDE_FACT_LABELS: Record<TideDirection, string> = {
  rising: 'marée montante',
  falling: 'marée descendante',
  slack: 'marée étale',
}

// ─── Justification ─────────────────────────────────────────────────────────────

/** La tendance matchée la plus forte (part la plus haute ; à égalité, la première). */
function strongestMatched(matched: MatchedTendency[]): MatchedTendency | null {
  let best: MatchedTendency | null = null
  for (const m of matched) {
    if (best === null || m.share > best.share) best = m
  }
  return best
}

/** Faits mesurés cités tels quels : « coef 92, marée descendante, vent NO 12 km/h ». */
function factParts(facts: JustificationInput['facts']): string[] {
  const parts: string[] = []
  if (!facts) return parts
  if (facts.tideCoefficient != null && Number.isFinite(facts.tideCoefficient)) {
    // VRAI coefficient uniquement (branche SHOM future) : jamais fabriqué ici.
    parts.push(`coef ${Math.round(facts.tideCoefficient)}`)
  } else if (facts.tideRangeM != null && Number.isFinite(facts.tideRangeM)) {
    parts.push(`marnage ${frDecimal1(facts.tideRangeM)} m`)
  }
  if (facts.tideDirection) parts.push(TIDE_FACT_LABELS[facts.tideDirection])
  if (facts.windSpeedKmh != null && Number.isFinite(facts.windSpeedKmh)) {
    const dir = facts.windDirectionLabel?.trim()
    parts.push(`vent ${dir ? `${dir} ` : ''}${Math.round(facts.windSpeedKmh)} km/h`)
  }
  return parts
}

/**
 * Phrase FR de justification, sans coordonnée et sans chiffre inventé.
 *
 * Perso     : « Marée descendante, vent NO 12 km/h : 6 de tes 7 prises renseignées
 *              tombent en marée descendante. »
 * Générique : « Alerte générique grande marée (marnage 5,4 m). Logue tes prises
 *              pour la personnaliser. »
 */
export function buildJustification(input: JustificationInput): string {
  if (input.kind === 'generique') {
    const facts = input.facts
    let figure = ''
    if (facts?.tideCoefficient != null && Number.isFinite(facts.tideCoefficient)) {
      figure = ` (coef ${Math.round(facts.tideCoefficient)})`
    } else if (facts?.tideRangeM != null && Number.isFinite(facts.tideRangeM)) {
      figure = ` (marnage ${frDecimal1(facts.tideRangeM)} m)`
    }
    return `Alerte générique grande marée${figure}. Logue tes prises pour la personnaliser.`
  }

  const facts = factParts(input.facts)
  const best = strongestMatched(input.matched ?? [])

  // Garde-fou : un « perso » sans tendance matchée ne cite aucun compte (on ne
  // fabrique rien). La décision d'envoi en amont rend ce cas improbable.
  if (!best || best.sampleCount <= 0) {
    const base = 'Fenêtre favorable demain sur ce spot.'
    return facts.length > 0 ? `${capitalize(facts.join(', '))}. ${base}` : base
  }

  const clause =
    best.count === best.sampleCount
      ? `tes ${best.sampleCount} prises renseignées tombent ${best.label}`
      : `${best.count} de tes ${best.sampleCount} prises renseignées tombent ${best.label}`

  return facts.length > 0
    ? `${capitalize(facts.join(', '))} : ${clause}.`
    : `${capitalize(clause)}.`
}

// ─── Message (title / body / emailSubject) ─────────────────────────────────────

/**
 * Compose la copie des 3 canaux à partir d'un payload (ou d'un sous-ensemble).
 * `body` sert le push ET l'in-app : l'appelant tronque à 140 caractères pour
 * `notifications.preview_text` (`body.slice(0, 140)`, pattern des crons existants).
 *
 * Objet email perso (brief, verrouillé) : « Demain 06:10 à [spot] : tes conditions ».
 * En générique, on ne dit JAMAIS « tes conditions » (rien de perso à vendre) :
 * « Demain 06:10 à [spot] : grande marée ».
 */
export function buildAlertMessage(
  payload: Pick<SpotAlertPayload, 'spotName' | 'windowLabel' | 'kind' | 'justification'>,
): AlertMessage {
  const when = capitalize(payload.windowLabel)

  if (payload.kind === 'generique') {
    return {
      title: `Grande marée demain à ${payload.spotName}`,
      // Label générique EN TÊTE du body (revue S72) : preview_text est rendu
      // tronqué sur une ligne dans le fil de notifications, le label doit
      // survivre à la troncature quel que soit le nom du spot.
      body: `${payload.justification} ${when} à ${payload.spotName}.`,
      emailSubject: `${when} à ${payload.spotName} : grande marée`,
    }
  }

  return {
    title: `Tes conditions arrivent à ${payload.spotName}`,
    body: `${when} à ${payload.spotName}. ${payload.justification}`,
    emailSubject: `${when} à ${payload.spotName} : tes conditions`,
  }
}

// ─── Alerte GRANDE MARÉE sur spot favori (sprint 77) ───────────────────────────

/**
 * Ce que l'utilisateur lit vraiment. Le mot « coefficient » n'apparaît NULLE PART :
 * ce projet n'en calcule aucun (cf lib/alerts/types.ts). Les deux seuls chiffres
 * cités sont le marnage MESURÉ du lendemain et le seuil de façade franchi, tous
 * deux fournis par l'appelant.
 *
 * Exemple : « Marnage prévu 9,4 m demain à Cap Fréhel, au-dessus du seuil de
 * grande marée de la façade (9 m). »
 */
export function buildBigTideMessage(
  payload: Pick<BigTideAlertPayload, 'spotName' | 'rangeM' | 'thresholdM'>,
): AlertMessage {
  const range = frDecimal1(payload.rangeM)
  const threshold = frDecimal1(payload.thresholdM)

  return {
    title: `Grande marée demain à ${payload.spotName}`,
    body: `Marnage prévu ${range} m demain à ${payload.spotName}, au-dessus du seuil de grande marée de la façade (${threshold} m).`,
    emailSubject: `Grande marée demain à ${payload.spotName} : marnage ${range} m`,
  }
}
