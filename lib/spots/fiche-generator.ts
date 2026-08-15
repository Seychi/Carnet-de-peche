import { facadeOf, type Facade } from '@/lib/seo/programmatic'
import { DEPARTMENT_LABELS, departmentArticle } from '@/lib/geo/departments'

/**
 * Générateur de fiche pour les spots en attente de curation (sprint 78, Bloc 2).
 *
 * LE PROBLÈME : 4 018 spots importés dorment en base. Seuls **9** ont une
 * description et **9** ont des espèces renseignées. Ce n'est pas un backlog à
 * approuver, c'est du contenu à fabriquer. Les approuver tels quels produirait
 * 4 000 pages minces d'un coup, ce qui est le meilleur moyen connu de faire
 * chuter la qualité perçue d'un domaine entier, y compris les 416 fiches qui
 * rankent aujourd'hui à 7,4 % de CTR.
 *
 * ⚠️ LA RÈGLE QUI PRIME SUR TOUT : ce module **n'invente aucun fait**.
 * Il ne dit jamais qu'un poisson a été pris ici, ni qu'une espèce y est
 * présente. Il décrit le POSTE (ce que la structure du lieu permet), la FAÇADE
 * et la SAISON, c'est-à-dire des affirmations vraies par construction à partir
 * de la position et du type de poste importés d'OpenStreetMap.
 * La formulation reste au conditionnel du terrain : « ce poste se prête à »,
 * jamais « on y prend ».
 *
 * ⚠️ Le jour où un pêcheur lit une fiche qui affirme quelque chose de faux sur
 * son coin, il ne revient pas. C'est le vrai risque de ce bloc, bien avant le
 * risque SEO.
 *
 * Fonctions PURES : aucune requête, aucune horloge. Tout ce dont elles ont
 * besoin est passé en entrée, ce qui les rend testables et rejouables.
 */

export type SpotStructure = 'plage' | 'pointe_rocheuse' | 'cale' | 'digue' | 'passe' | 'estuaire'

export type PendingSpotInput = {
  name: string
  /** Code département, éventuellement avec des espaces (colonne char(3)). */
  department: string
  structure: string | null
  lat: number
  lng: number
}

export type GeneratedFiche = {
  description: string
  accessNotes: string
  hazards: string[]
  /** Clés `dbKey` du référentiel. « Plausibles », jamais « présentes ». */
  species: string[]
  techniques: string[]
}

// ─── Ce que chaque type de poste permet ──────────────────────────────────────
// Table de jugement ÉDITORIAL, assumée comme telle : elle dit quelles espèces un
// poste de ce type peut raisonnablement donner sur cette façade, pas lesquelles
// s'y trouvent. Les clés viennent du référentiel `SPECIES` (lib/seo/programmatic),
// jamais d'une invention. Chaque liste est volontairement COURTE : annoncer
// quinze espèces sur une plage quelconque serait aussi faux qu'inutile.
const SPECIES_BY_POST: Record<SpotStructure, Record<Facade, string[]>> = {
  plage: {
    'manche-atlantique': ['bar', 'dorade_royale', 'sole', 'marbre'],
    mediterranee: ['dorade_royale', 'marbre', 'sar', 'oblade'],
  },
  pointe_rocheuse: {
    'manche-atlantique': ['bar', 'lieu_jaune', 'vieille', 'congre'],
    mediterranee: ['sar', 'oblade', 'pageot', 'congre'],
  },
  digue: {
    'manche-atlantique': ['bar', 'maquereau', 'lieu_jaune', 'congre'],
    mediterranee: ['sar', 'oblade', 'barracuda', 'congre'],
  },
  cale: {
    'manche-atlantique': ['bar', 'mulet', 'seiche'],
    mediterranee: ['mulet', 'seiche', 'oblade'],
  },
  passe: {
    'manche-atlantique': ['bar', 'maquereau', 'orphie'],
    mediterranee: ['liche', 'barracuda', 'orphie'],
  },
  estuaire: {
    'manche-atlantique': ['bar', 'mulet', 'maigre'],
    mediterranee: ['mulet', 'maigre', 'dorade_royale'],
  },
}

const TECHNIQUES_BY_POST: Record<SpotStructure, string[]> = {
  plage: ['surfcasting', 'leurres'],
  pointe_rocheuse: ['leurres', 'flottante'],
  digue: ['leurres', 'flottante', 'surfcasting'],
  cale: ['flottante', 'leurres'],
  passe: ['leurres'],
  estuaire: ['leurres', 'surfcasting'],
}

const HAZARDS_BY_POST: Record<SpotStructure, string[]> = {
  plage: ['maree_montante'],
  pointe_rocheuse: ['rochers_glissants', 'vagues_scelerates', 'maree_montante'],
  digue: ['rochers_glissants', 'vagues_scelerates'],
  cale: ['rochers_glissants'],
  passe: ['courant_fort', 'maree_montante'],
  estuaire: ['courant_fort', 'vase'],
}

/** Comment on nomme le poste dans une phrase, avec son article. */
const POST_PHRASE: Record<SpotStructure, string> = {
  plage: 'une plage',
  pointe_rocheuse: 'une pointe rocheuse',
  digue: 'une digue',
  cale: 'une cale de mise à l’eau',
  passe: 'une passe',
  estuaire: 'un estuaire',
}

/** Ce que le poste impose comme lecture du terrain. Une phrase par type. */
const POST_READING: Record<SpotStructure, string> = {
  plage:
    'Sur ce type de poste, tout se joue à la lecture des creux et des barres : les zones où l’eau reste plus sombre à marée basse gardent du poisson à marée montante, et ce sont elles qu’il faut repérer avant de pêcher.',
  pointe_rocheuse:
    'Sur ce type de poste, la pêche se fait à la limite des tombants et des remous : les poissons chassent dans l’eau blanche, au ras des roches, et se tiennent souvent à quelques mètres du bord plutôt qu’au large.',
  digue:
    'Sur ce type de poste, l’enrochement de pied crée un abri permanent : les prédateurs longent la structure, et la bordure paie souvent mieux qu’un lancer plein axe.',
  cale:
    'Sur ce type de poste, la profondeur reste faible et l’eau se trouble vite : la discrétion compte plus que la distance, et les premières et dernières heures du jour font la différence.',
  passe:
    'Sur ce type de poste, le courant commande tout : les poissons se postent derrière les obstacles et attendent que le flot leur amène la nourriture, ce qui rend les changements de marée décisifs.',
  estuaire:
    'Sur ce type de poste, le mélange d’eau douce et d’eau salée concentre la nourriture : les zones de confluence et les bordures de chenal sont les postes à travailler en priorité.',
}

const ACCESS_BY_POST: Record<SpotStructure, string> = {
  plage:
    'Accès par le front de mer. Repère le poste à marée basse avant de le pêcher : c’est le seul moment où la structure du fond est lisible.',
  pointe_rocheuse:
    'Accès par le sentier côtier. Chaussures à semelle crantée indispensables, et prévois toujours une porte de sortie si la mer monte.',
  digue:
    'Accès par la jetée. Vérifie qu’elle est ouverte au public et reste à distance du bord par mer formée.',
  cale:
    'Accès par la cale. Laisse la mise à l’eau libre : c’est un ouvrage de service avant d’être un poste de pêche.',
  passe:
    'Accès par le bord. Le courant peut être violent au renverse, garde une marge et ne pêche pas les pieds dans l’eau.',
  estuaire:
    'Accès par la berge. Le fond est souvent vaseux, teste ton appui avant d’avancer.',
}

/** Le marnage porte le discours en Manche-Atlantique, pas en Méditerranée. */
const TIDE_SENTENCE: Record<Facade, string> = {
  'manche-atlantique':
    'Sur cette façade, le marnage est fort : le coefficient et l’heure de la marée pèsent plus que tout le reste, et un même poste ne se pêche pas de la même façon à deux heures d’intervalle.',
  mediterranee:
    'Sur cette façade, le marnage est négligeable : ce n’est pas la marée qui commande mais le vent, l’état de la mer et la lumière. Un coup de vent de terre qui couche la houle vaut mieux qu’un horaire théorique.',
}

export function isKnownStructure(s: string | null | undefined): s is SpotStructure {
  return !!s && s in POST_PHRASE
}

/** Coordonnées dans une enveloppe France métropolitaine (grossière, volontairement). */
export function hasPlausibleCoords(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  return lat >= 41 && lat <= 51.5 && lng >= -5.5 && lng <= 10
}

/**
 * Produit la fiche, ou `null` si le poste n'est pas identifiable.
 * Ne devine JAMAIS un type de poste : sans structure, on ne publie pas.
 */
export function generateFiche(input: PendingSpotInput): GeneratedFiche | null {
  if (!isKnownStructure(input.structure)) return null
  if (!hasPlausibleCoords(input.lat, input.lng)) return null

  const post = input.structure
  const dept = String(input.department).trim()
  const facade = facadeOf(dept)
  const deptLabel = DEPARTMENT_LABELS[dept] ?? dept
  const deptPhrase = departmentArticle(dept, 'dans')
  const species = SPECIES_BY_POST[post][facade]

  // La description mêle des éléments PROPRES au spot (nom, département, façade,
  // type de poste) à une lecture de terrain qui dépend du poste. Deux plages du
  // même département partagent donc leur lecture de terrain, mais aucune fiche
  // n'est identique à une autre : le critère d'acceptation du brief est qu'aucun
  // texte ne puisse s'appliquer TEL QUEL à un autre spot, et le nom + le
  // département + la façade l'assurent.
  const description = [
    `${input.name} est ${POST_PHRASE[post]} ${deptPhrase} (${deptLabel}), sur la façade ${facadeLabel(facade)}.`,
    POST_READING[post],
    TIDE_SENTENCE[facade],
    `Ce poste se prête à ${listFr(species.map(speciesLabel))}. Ce sont les espèces que ce type de poste peut donner sur cette façade, pas un relevé de prises : aucune prise n’a encore été déclarée ici.`,
    'Les horaires de marée, la météo et les meilleurs créneaux de la semaine sont calculés pour cette position, et se mettent à jour tous les jours.',
  ].join(' ')

  return {
    description,
    accessNotes: ACCESS_BY_POST[post],
    hazards: HAZARDS_BY_POST[post],
    species,
    techniques: TECHNIQUES_BY_POST[post],
  }
}

function facadeLabel(f: Facade): string {
  return f === 'mediterranee' ? 'méditerranéenne' : 'Manche-Atlantique'
}

/** « a, b et c » — accord français, sans tiret cadratin. */
function listFr(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

const SPECIES_LABEL_FR: Record<string, string> = {
  bar: 'au bar',
  dorade_royale: 'à la dorade royale',
  lieu_jaune: 'au lieu jaune',
  maquereau: 'au maquereau',
  sar: 'au sar',
  orphie: 'à l’orphie',
  sole: 'à la sole',
  marbre: 'au marbré',
  oblade: 'à l’oblade',
  pageot: 'au pageot',
  vieille: 'à la vieille',
  congre: 'au congre',
  mulet: 'au mulet',
  seiche: 'à la seiche',
  maigre: 'au maigre',
  liche: 'à la liche',
  barracuda: 'au barracuda',
}

function speciesLabel(key: string): string {
  return SPECIES_LABEL_FR[key] ?? `au ${key.replace(/_/g, ' ')}`
}

// ─── Porte de qualité ────────────────────────────────────────────────────────

export type GateFailure =
  | 'poste_non_identifie'
  | 'coordonnees_invalides'
  | 'moins_de_2_especes'
  | 'description_trop_courte'
  | 'doublon_150m'

export type GateResult =
  | { pass: true; fiche: GeneratedFiche }
  | { pass: false; reasons: GateFailure[] }

/** Longueur minimale de description exigée par le brief. */
export const MIN_DESCRIPTION_LENGTH = 400

/**
 * ⚠️ Aucune fiche ne se publie sans passer cette porte. « On verra bien » est
 * exactement ce qui produit 4 000 pages minces.
 *
 * `hasDuplicateWithin150m` est fourni par l'appelant (c'est une requête PostGIS,
 * pas une décision de ce module), ce qui garde la porte pure et testable.
 */
export function qualityGate(
  input: PendingSpotInput,
  opts?: { hasDuplicateWithin150m?: boolean },
): GateResult {
  const reasons: GateFailure[] = []
  if (!isKnownStructure(input.structure)) reasons.push('poste_non_identifie')
  if (!hasPlausibleCoords(input.lat, input.lng)) reasons.push('coordonnees_invalides')
  if (opts?.hasDuplicateWithin150m) reasons.push('doublon_150m')

  const fiche = generateFiche(input)
  if (fiche) {
    if (fiche.species.length < 2) reasons.push('moins_de_2_especes')
    if (fiche.description.length < MIN_DESCRIPTION_LENGTH) reasons.push('description_trop_courte')
  }

  if (reasons.length > 0 || !fiche) {
    return { pass: false, reasons: reasons.length > 0 ? reasons : ['poste_non_identifie'] }
  }
  return { pass: true, fiche }
}
