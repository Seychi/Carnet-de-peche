/**
 * Combinatoire des pages programmatiques /peche/[espèce]/[technique]/[dépt]
 * (sprint 10 Bloc 2). Whitelist stricte : on ne génère QUE les combinaisons
 * qui ont un sens halieutique — une page « lieu jaune en Méditerranée » ou
 * « maquereau au surfcasting » serait du thin content absurde qui décrédibilise
 * tout le site (cf docs/sprint-10/BRIEF.md).
 */

import { COASTAL_DEPARTMENTS, DEPARTMENT_LABELS } from '@/lib/geo/departments'

// ─── Espèces ──────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// RÉFÉRENTIEL ESPÈCES — SOURCE UNIQUE (sprint 23, Chantier B).
// Toutes les autres listes (SPECIES_LABELS, SPECIES_HABITAT, catchSpeciesEnum, les
// filtres carte, l'onboarding) DÉRIVENT d'ici. Ne plus maintenir de liste parallèle.
// La réglementation (mailles + sources + dates) reste dans EspeceContent.regulation
// (lib/especes/content/*) — un seul endroit sourcé et daté, pas dupliqué ici.
// ═══════════════════════════════════════════════════════════════════════════════
export type SpeciesSlug =
  | 'bar'
  | 'dorade-royale'
  | 'lieu-jaune'
  | 'maquereau'
  | 'sar'
  | 'orphie'
  | 'seiche'
  | 'mulet'
  | 'sole'
  | 'calmar'
  | 'congre'
  | 'vieille'
  | 'rouget'
  | 'dorade-grise'
  | 'pageot'
  | 'oblade'
  | 'maigre'
  | 'tacaud'
  | 'chinchard'
  | 'plie'
  // Sprint 29 — +6 espèces du bord. Med : barracuda / liche / marbré ; tassergal Med (+ Atl) ;
  // Manche-Atlantique : lieu noir / merlan.
  | 'barracuda'
  | 'tassergal'
  | 'liche'
  | 'marbre'
  | 'lieu-noir'
  | 'merlan'

export type SpeciesMeta = {
  label: string
  labelLower: string
  dbKey: string
  latin: string
  /** Article défini majuscule, élision incluse : « Le », « La », « L' ». Espace final SAUF élision. Toujours coller : `${article}${labelLower}`. */
  article: string
  /** « de » + défini : « du », « de la », « de l' ». Espace final SAUF élision. Toujours coller : `${articleDe}${labelLower}`. */
  articleDe: string
  /** Genre grammatical, pour les accords (« le/la pêcher »…). */
  gender: 'm' | 'f'
  /** Loggable au carnet → source unique de `catchSpeciesEnum` (D-B2, sprint 23). */
  inCarnet: boolean
  /** Possède une fiche profonde /especes/<slug> (les 20 au sprint 23). */
  hasDeepSheet: boolean
  /** Génère des pages programmatiques /peche/… — requiert un `SpeciesContent` (anti thin content). */
  hasProgrammatic: boolean
}

export const SPECIES: Record<SpeciesSlug, SpeciesMeta> = {
  bar: { label: 'Bar', labelLower: 'bar', dbKey: 'bar', latin: 'Dicentrarchus labrax', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  'dorade-royale': { label: 'Dorade royale', labelLower: 'dorade royale', dbKey: 'dorade_royale', latin: 'Sparus aurata', article: 'La ', articleDe: 'de la ', gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  'lieu-jaune': { label: 'Lieu jaune', labelLower: 'lieu jaune', dbKey: 'lieu_jaune', latin: 'Pollachius pollachius', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  maquereau: { label: 'Maquereau', labelLower: 'maquereau', dbKey: 'maquereau', latin: 'Scomber scombrus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  sar: { label: 'Sar', labelLower: 'sar', dbKey: 'sar', latin: 'Diplodus sargus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  orphie: { label: 'Orphie', labelLower: 'orphie', dbKey: 'orphie', latin: 'Belone belone', article: "L'", articleDe: "de l'", gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  // ── Sprint 23 : extension à 20 espèces du bord (fiches profondes + carnet) ──
  // hasProgrammatic=false : pas (encore) de SpeciesContent → aucune page /peche/… générée
  // pour elles (garde-fou anti thin content, cf WS-C).
  // hasProgrammatic passé à true au sprint 83 Bloc 4 pour les 6 espèces à inventaire
  // MESURÉ (seiche, rouget, pageot, oblade, marbré, liche) : elles ont un
  // `SpeciesContent` rédigé ET des spots réels derrière chaque page (cf
  // SPECIES_DEPARTMENTS_WITH_INVENTORY plus bas).
  seiche: { label: 'Seiche', labelLower: 'seiche', dbKey: 'seiche', latin: 'Sepia officinalis', article: 'La ', articleDe: 'de la ', gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  mulet: { label: 'Mulet', labelLower: 'mulet', dbKey: 'mulet', latin: 'Chelon labrosus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  sole: { label: 'Sole', labelLower: 'sole', dbKey: 'sole', latin: 'Solea solea', article: 'La ', articleDe: 'de la ', gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  calmar: { label: 'Calmar', labelLower: 'calmar', dbKey: 'calmar', latin: 'Loligo vulgaris', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  congre: { label: 'Congre', labelLower: 'congre', dbKey: 'congre', latin: 'Conger conger', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  vieille: { label: 'Vieille', labelLower: 'vieille', dbKey: 'vieille', latin: 'Labrus bergylta', article: 'La ', articleDe: 'de la ', gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  rouget: { label: 'Rouget', labelLower: 'rouget', dbKey: 'rouget', latin: 'Mullus surmuletus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  'dorade-grise': { label: 'Dorade grise', labelLower: 'dorade grise', dbKey: 'dorade_grise', latin: 'Spondyliosoma cantharus', article: 'La ', articleDe: 'de la ', gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  pageot: { label: 'Pageot', labelLower: 'pageot', dbKey: 'pageot', latin: 'Pagellus erythrinus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  oblade: { label: 'Oblade', labelLower: 'oblade', dbKey: 'oblade', latin: 'Oblada melanura', article: "L'", articleDe: "de l'", gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  maigre: { label: 'Maigre', labelLower: 'maigre', dbKey: 'maigre', latin: 'Argyrosomus regius', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  tacaud: { label: 'Tacaud', labelLower: 'tacaud', dbKey: 'tacaud', latin: 'Trisopterus luscus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  chinchard: { label: 'Chinchard', labelLower: 'chinchard', dbKey: 'chinchard', latin: 'Trachurus trachurus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  plie: { label: 'Plie', labelLower: 'plie', dbKey: 'plie', latin: 'Pleuronectes platessa', article: 'La ', articleDe: 'de la ', gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  // ── Sprint 29 : +6 espèces du bord (fiches profondes ; pas de pages programmatiques) ──
  barracuda: { label: 'Barracuda', labelLower: 'barracuda', dbKey: 'barracuda', latin: 'Sphyraena viridensis', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  tassergal: { label: 'Tassergal', labelLower: 'tassergal', dbKey: 'tassergal', latin: 'Pomatomus saltatrix', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  liche: { label: 'Liche', labelLower: 'liche', dbKey: 'liche', latin: 'Lichia amia', article: 'La ', articleDe: 'de la ', gender: 'f', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  marbre: { label: 'Marbré', labelLower: 'marbré', dbKey: 'marbre', latin: 'Lithognathus mormyrus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: true },
  'lieu-noir': { label: 'Lieu noir', labelLower: 'lieu noir', dbKey: 'lieu_noir', latin: 'Pollachius virens', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
  merlan: { label: 'Merlan', labelLower: 'merlan', dbKey: 'merlan', latin: 'Merlangius merlangus', article: 'Le ', articleDe: 'du ', gender: 'm', inCarnet: true, hasDeepSheet: true, hasProgrammatic: false },
}

// ── Dérivés du référentiel (ne pas dupliquer ces listes ailleurs) ──────────────
export const SPECIES_SLUGS = Object.keys(SPECIES) as SpeciesSlug[]

/** dbKey (snake_case) → slug (kebab) : pont label DB ↔ référentiel (maillage spot↔espèce). */
export const SPECIES_BY_DB_KEY: Record<string, SpeciesSlug> = Object.fromEntries(
  (Object.entries(SPECIES) as [SpeciesSlug, SpeciesMeta][]).map(([slug, m]) => [m.dbKey, slug]),
)

/** Toutes les clés DB du référentiel — filtres carte (les spots portent un text[] libre). */
export const ALL_SPECIES_DB_KEYS: string[] = Object.values(SPECIES).map((m) => m.dbKey)

/** Clés DB loggables au carnet — source unique de `catchSpeciesEnum` (D-B2, sprint 23). */
export const CARNET_SPECIES_DB_KEYS: string[] = Object.values(SPECIES)
  .filter((m) => m.inCarnet)
  .map((m) => m.dbKey)

/**
 * Options { value: dbKey, label } loggables au carnet, CŒUR D'ABORD (ordre d'insertion).
 * SOURCE UNIQUE du sélecteur d'espèce (`CatchForm`) et de l'onboarding — fini la liste
 * codée en dur à 6 (sprint 31, F3). `catches.species` étant du texte libre, aucune
 * contrainte DB ne borne cette liste : la garde reste la validation zod (`catchSpeciesEnum`).
 */
export const CARNET_SPECIES_OPTIONS: { value: string; label: string }[] = Object.values(SPECIES)
  .filter((m) => m.inCarnet)
  .map((m) => ({ value: m.dbKey, label: m.label }))

/**
 * Espèces « cœur » du produit v1 (CLAUDE.md §1) — quick-picks en accès direct dans le
 * sélecteur carnet. Les 20 autres passent par la recherche « Autre espèce » (sprint 31).
 */
export const CORE_SPECIES_SLUGS: SpeciesSlug[] = [
  'bar',
  'dorade-royale',
  'lieu-jaune',
  'maquereau',
  'sar',
  'orphie',
]

/** Clés DB des espèces cœur (dérivé de `CORE_SPECIES_SLUGS`) — split quick-picks / recherche. */
export const CORE_SPECIES_DB_KEYS: string[] = CORE_SPECIES_SLUGS.map((slug) => SPECIES[slug].dbKey)

// ─── Techniques ───────────────────────────────────────────────────────────────

export type TechniqueSlug = 'leurres' | 'surfcasting' | 'flottante' | 'vif'

export const TECHNIQUES: Record<
  TechniqueSlug,
  { label: string; withArticle: string; dbKey: string }
> = {
  leurres: { label: 'Aux leurres', withArticle: 'aux leurres', dbKey: 'leurres' },
  surfcasting: { label: 'Au surfcasting', withArticle: 'au surfcasting', dbKey: 'surfcasting' },
  flottante: { label: 'À la flottante', withArticle: 'à la flottante', dbKey: 'flottante' },
  vif: { label: 'Au vif', withArticle: 'au vif', dbKey: 'vif' },
}

// ─── Départements (slug URL ↔ code) ──────────────────────────────────────────

export const DEPARTMENT_SLUGS: Record<string, string> = {
  // Manche / Atlantique
  '14': 'calvados',
  '17': 'charente-maritime',
  '22': 'cotes-d-armor',
  '29': 'finistere',
  '33': 'gironde',
  '35': 'ille-et-vilaine',
  '40': 'landes',
  '44': 'loire-atlantique',
  '50': 'manche',
  '56': 'morbihan',
  '59': 'nord',
  '62': 'pas-de-calais',
  '64': 'pyrenees-atlantiques',
  '76': 'seine-maritime',
  '85': 'vendee',
  // Méditerranée
  '06': 'alpes-maritimes',
  '11': 'aude',
  '13': 'bouches-du-rhone',
  '30': 'gard',
  '34': 'herault',
  '66': 'pyrenees-orientales',
  '83': 'var',
  '2A': 'corse-du-sud',
  '2B': 'haute-corse',
}

export const SLUG_TO_DEPARTMENT: Record<string, string> = Object.fromEntries(
  Object.entries(DEPARTMENT_SLUGS).map(([code, slug]) => [slug, code]),
)

const MED_DEPARTMENTS = new Set(['06', '11', '13', '30', '34', '66', '83', '2A', '2B'])
const ATLANTIC_SOUTH = new Set(['17', '33', '40', '64', '85'])

export type Facade = 'manche-atlantique' | 'mediterranee'

export function facadeOf(deptCode: string): Facade {
  return MED_DEPARTMENTS.has(deptCode) ? 'mediterranee' : 'manche-atlantique'
}

// ─── La matrice (le cœur du filtrage anti-absurde) ───────────────────────────

/**
 * Techniques pertinentes du bord par espèce — PARTIAL : seules les espèces présentes
 * ici génèrent des pages programmatiques /peche/… (elles doivent avoir un
 * `SpeciesContent` dans lib/seo/content/). Les espèces sprint 23 sans contenu
 * programmatique sont volontairement absentes → aucune page creuse (garde-fou WS-C).
 * Doit rester cohérent avec `SPECIES[slug].hasProgrammatic`.
 */
const SPECIES_TECHNIQUES: Partial<Record<SpeciesSlug, TechniqueSlug[]>> = {
  bar: ['leurres', 'surfcasting', 'vif', 'flottante'],
  'dorade-royale': ['surfcasting', 'flottante', 'leurres'],
  'lieu-jaune': ['leurres', 'vif'],
  maquereau: ['leurres', 'flottante'],
  sar: ['surfcasting', 'flottante'],
  orphie: ['flottante', 'leurres'],
  // ── Sprint 83, Bloc 4 : ouverture aux espèces à inventaire réel ──────────────
  // Aucune technique inventée ici : chaque couple reprend EXACTEMENT les techniques
  // déjà rédigées et sourcées sur la fiche profonde correspondante
  // (`lib/especes/content/<slug>.ts`, tableau `techniques`). Si une technique n'y
  // figure pas, elle n'a pas de page.
  seiche: ['leurres', 'flottante'],
  oblade: ['flottante', 'surfcasting'],
  marbre: ['surfcasting', 'flottante'],
  pageot: ['surfcasting', 'flottante'],
  rouget: ['surfcasting'],
  liche: ['leurres', 'vif'],
}

/**
 * Départements réellement POURVUS, mesurés en base le **2026-08-17** (sprint 83,
 * Bloc 4). Requête de référence, à rejouer avant tout élargissement :
 *
 * ```sql
 * select sp as species, trim(s.department) as dept, count(*) as spots
 * from public.spots s, unnest(s.species) as sp
 * where s.moderation_status = 'approved' and s.visibility = 'public'
 * group by 1, 2 having count(*) >= 3 order by 1, 3 desc;
 * ```
 *
 * ⚠️ `spots.department` est un `char(3)` complété par des espaces : `trim()` des
 * DEUX côtés, sinon le regroupement rend des départements fantômes (bugs S52/S67).
 *
 * SEUIL = 3 spots. En dessous, la page n'a rien à montrer : son bloc « les spots de
 * la carte » servirait une liste d'un ou deux liens, c'est-à-dire exactement la page
 * creuse que la matrice existe pour empêcher. Un département absent d'ici n'a pas
 * d'URL et ne sort pas au sitemap : la page ne peut donc pas répondre 404 par
 * manque de matière, elle n'existe simplement pas.
 *
 * Différence assumée avec le `switch` ci-dessous : les 6 espèces historiques sont
 * bornées par leur AIRE DE RÉPARTITION (fait halieutique stable), les 6 nouvelles
 * par l'INVENTAIRE MESURÉ (fait de catalogue, qui bouge avec la curation). Les
 * deux garde-fous se cumulent, ils ne se remplacent pas.
 */
const SPECIES_DEPARTMENTS_WITH_INVENTORY: Partial<Record<SpeciesSlug, readonly string[]>> = {
  // 225 spots / 24 dépts, tous au-dessus du seuil : 56(45) 29(40) 44(12) 85(12)
  // 13(9) 22(9) 2A(9) 2B(9) 50(8) 17(7) 34(6) 76(6) 83(6) 06(5) 33(5) 35(5)
  // 62(5) 64(5) 14(4) 30(4) 40(4) 66(4) 11(3) 59(3).
  seiche: [...COASTAL_DEPARTMENTS],
  // 227 spots / 9 dépts méditerranéens : 2A(34) 2B(32) 83(30) 13(29) 06(28)
  // 66(24) 34(22) 11(19) 30(9).
  oblade: ['06', '11', '13', '30', '34', '66', '83', '2A', '2B'],
  // 112 spots / 9 dépts méditerranéens : 2B(22) 34(18) 11(17) 06(15) 83(10)
  // 30(9) 66(9) 2A(8) 13(4).
  marbre: ['06', '11', '13', '30', '34', '66', '83', '2A', '2B'],
  // 101 spots. Écartés faute d'inventaire : 34(2), 64(2), 30(1).
  // Retenus : 13(26) 2A(21) 83(20) 66(12) 06(8) 2B(6) 11(3).
  pageot: ['06', '11', '13', '66', '83', '2A', '2B'],
  // 43 spots très dispersés (23 dépts), mais 5 seulement tiennent le seuil :
  // 33(5) 85(4) 34(3) 40(3) 44(3). Les 18 autres sont à 1 ou 2 spots.
  rouget: ['33', '34', '40', '44', '85'],
  // 15 spots seulement, dont 2 dépts au seuil : 2A(3) 83(3). Le reste est à 1 ou 2.
  liche: ['83', '2A'],
}

/** Départements où l'espèce est réellement pêchable du bord ET pourvue en spots. */
function speciesDepartments(species: SpeciesSlug): string[] {
  // Espèces ouvertes au sprint 83 : bornées par l'inventaire mesuré. Le filtre passe
  // par COASTAL_DEPARTMENTS pour garder l'ordre canonique (sitemap déterministe) et
  // pour qu'un code hors liste côtière ne puisse pas se glisser dans une URL.
  const measured = SPECIES_DEPARTMENTS_WITH_INVENTORY[species]
  if (measured) return COASTAL_DEPARTMENTS.filter((d) => measured.includes(d))

  switch (species) {
    case 'lieu-jaune':
      // Eau froide : Manche + Atlantique nord uniquement, absent de Méditerranée.
      return COASTAL_DEPARTMENTS.filter((d) => !MED_DEPARTMENTS.has(d))
    case 'sar':
      // Méditerranée + Atlantique sud (rare au nord de la Loire).
      return COASTAL_DEPARTMENTS.filter((d) => MED_DEPARTMENTS.has(d) || ATLANTIC_SOUTH.has(d))
    default:
      return [...COASTAL_DEPARTMENTS]
  }
}

export type ProgrammaticPage = {
  species: SpeciesSlug
  technique: TechniqueSlug
  /** Code département — null pour la page nationale /peche/<espèce>/<technique>. */
  deptCode: string | null
}

/** Toutes les pages valides (nationales + départementales) — uniquement les espèces avec contenu programmatique. */
export function getAllProgrammaticPages(): ProgrammaticPage[] {
  const pages: ProgrammaticPage[] = []
  for (const [species, techniques] of Object.entries(SPECIES_TECHNIQUES) as [
    SpeciesSlug,
    TechniqueSlug[],
  ][]) {
    const depts = speciesDepartments(species)
    for (const technique of techniques) {
      pages.push({ species, technique, deptCode: null })
      for (const deptCode of depts) {
        pages.push({ species, technique, deptCode })
      }
    }
  }
  return pages
}

/** Résout un segment d'URL [...slug] → page valide, ou null (→ 404). */
export function resolveProgrammaticSlug(segments: string[]): ProgrammaticPage | null {
  if (segments.length < 2 || segments.length > 3) return null
  const [speciesSlug, techniqueSlug, deptSlug] = segments

  if (!(speciesSlug in SPECIES)) return null
  const species = speciesSlug as SpeciesSlug

  // Espèce sans contenu programmatique (sprint 23) → pas de page /peche/… (anti thin content).
  const techniques = SPECIES_TECHNIQUES[species]
  if (!techniques) return null

  if (!(techniqueSlug in TECHNIQUES)) return null
  const technique = techniqueSlug as TechniqueSlug
  if (!techniques.includes(technique)) return null

  if (!deptSlug) return { species, technique, deptCode: null }

  const deptCode = SLUG_TO_DEPARTMENT[deptSlug]
  if (!deptCode || !speciesDepartments(species).includes(deptCode)) return null
  return { species, technique, deptCode }
}

export function programmaticUrl(p: ProgrammaticPage): string {
  const base = `/peche/${p.species}/${p.technique}`
  return p.deptCode ? `${base}/${DEPARTMENT_SLUGS[p.deptCode]}` : base
}

/** Longueur au-delà de laquelle Google tronque le titre dans le SERP (sprint 76). */
export const SERP_TITLE_MAX = 60

/**
 * Titre d'une page programmatique.
 *
 * Sprint 76, Bloc 6 — deux défauts corrigés ici :
 *  1. L'article était masculin EN DUR (`Pêche du ${species}`) alors que le
 *     référentiel porte déjà `articleDe`. Google servait « Pêche du dorade
 *     royale au surfcasting dans la Manche » sur 125 pages sur 337.
 *  2. Mesuré le 2026-08-14 : 13 pages dépassaient DÉJÀ 60 caractères avant
 *     toute correction (jusqu'à 67), et l'accord féminin en ajoute 3 (23 pages,
 *     jusqu'à 70). Google coupe autour de 60, et ce qui saute en premier est
 *     le département, c'est-à-dire précisément le mot cherché.
 *
 * D'où une dégradation en 3 temps, jamais une troncature au milieu d'un mot.
 * Chaque forme garde espèce + technique + département : les titres restent
 * UNIQUES page à page (pas de doublon de <title>, qui coûterait plus cher que
 * la troncature qu'on évite).
 */
export function programmaticTitle(p: ProgrammaticPage): string {
  const meta = SPECIES[p.species]
  const technique = TECHNIQUES[p.technique].withArticle
  const subject = `${meta.articleDe}${meta.labelLower}`
  if (!p.deptCode) return `Pêche ${subject} ${technique} en France`
  const dept = DEPARTMENT_LABELS[p.deptCode] ?? p.deptCode

  // 1. Forme naturelle : « dans le Finistère », « dans les Landes », « en Vendée »…
  const natural = `Pêche ${subject} ${technique} ${deptPreposition(p.deptCode)}${dept}`
  if (natural.length <= SERP_TITLE_MAX) return natural

  // 2. La préposition longue (« dans les ») cède la place aux deux-points.
  const colon = `Pêche ${subject} ${technique} : ${dept}`
  if (colon.length <= SERP_TITLE_MAX) return colon

  // 3. Dernier recours (4 pages : dorade royale des Pyrénées) : on lâche le mot
  // « Pêche », qui reste porté par le H1 et la description, jamais l'espèce,
  // la technique ni le département.
  return `${meta.label} ${technique} : ${dept}`
}

/** Préposition française correcte par département — table explicite, pas d'heuristique. */
const DEPT_PREPOSITIONS: Record<string, string> = {
  '14': 'dans le ', // Calvados
  '17': 'en ', // Charente-Maritime
  '22': 'dans les ', // Côtes-d'Armor
  '29': 'dans le ', // Finistère
  '33': 'en ', // Gironde
  '35': 'en ', // Ille-et-Vilaine
  '40': 'dans les ', // Landes
  '44': 'en ', // Loire-Atlantique
  '50': 'dans la ', // Manche
  '56': 'dans le ', // Morbihan
  '59': 'dans le ', // Nord
  '62': 'dans le ', // Pas-de-Calais
  '64': 'dans les ', // Pyrénées-Atlantiques
  '76': 'en ', // Seine-Maritime
  '85': 'en ', // Vendée
  '06': 'dans les ', // Alpes-Maritimes
  '11': "dans l'", // Aude
  '13': 'dans les ', // Bouches-du-Rhône
  '30': 'dans le ', // Gard
  '34': "dans l'", // Hérault
  '66': 'dans les ', // Pyrénées-Orientales
  '83': 'dans le ', // Var
  '2A': 'en ', // Corse-du-Sud
  '2B': 'en ', // Haute-Corse
}

export function deptPreposition(deptCode: string): string {
  return DEPT_PREPOSITIONS[deptCode] ?? 'dans le '
}
