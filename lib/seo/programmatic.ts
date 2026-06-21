/**
 * Combinatoire des pages programmatiques /peche/[espèce]/[technique]/[dépt]
 * (sprint 10 Bloc 2). Whitelist stricte : on ne génère QUE les combinaisons
 * qui ont un sens halieutique — une page « lieu jaune en Méditerranée » ou
 * « maquereau au surfcasting » serait du thin content absurde qui décrédibilise
 * tout le site (cf docs/sprint-10/BRIEF.md).
 */

import { COASTAL_DEPARTMENTS, DEPARTMENT_LABELS } from '@/lib/geo/departments'

// ─── Espèces ──────────────────────────────────────────────────────────────────

export type SpeciesSlug =
  | 'bar'
  | 'dorade-royale'
  | 'lieu-jaune'
  | 'maquereau'
  | 'sar'
  | 'orphie'

export const SPECIES: Record<
  SpeciesSlug,
  {
    label: string
    labelLower: string
    dbKey: string
    latin: string
    /** Article défini majuscule, élision incluse : « Le », « La », « L' ». Espace final SAUF élision. Toujours coller : `${article}${labelLower}`. */
    article: string
    /** « de » + défini : « du », « de la », « de l' ». Espace final SAUF élision. Toujours coller : `${articleDe}${labelLower}`. */
    articleDe: string
  }
> = {
  bar: { label: 'Bar', labelLower: 'bar', dbKey: 'bar', latin: 'Dicentrarchus labrax', article: 'Le ', articleDe: 'du ' },
  'dorade-royale': {
    label: 'Dorade royale',
    labelLower: 'dorade royale',
    dbKey: 'dorade_royale',
    latin: 'Sparus aurata',
    article: 'La ',
    articleDe: 'de la ',
  },
  'lieu-jaune': {
    label: 'Lieu jaune',
    labelLower: 'lieu jaune',
    dbKey: 'lieu_jaune',
    latin: 'Pollachius pollachius',
    article: 'Le ',
    articleDe: 'du ',
  },
  maquereau: { label: 'Maquereau', labelLower: 'maquereau', dbKey: 'maquereau', latin: 'Scomber scombrus', article: 'Le ', articleDe: 'du ' },
  sar: { label: 'Sar', labelLower: 'sar', dbKey: 'sar', latin: 'Diplodus sargus', article: 'Le ', articleDe: 'du ' },
  orphie: { label: 'Orphie', labelLower: 'orphie', dbKey: 'orphie', latin: 'Belone belone', article: "L'", articleDe: "de l'" },
}

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

/** Techniques pertinentes du bord par espèce. */
const SPECIES_TECHNIQUES: Record<SpeciesSlug, TechniqueSlug[]> = {
  bar: ['leurres', 'surfcasting', 'vif', 'flottante'],
  'dorade-royale': ['surfcasting', 'flottante', 'leurres'],
  'lieu-jaune': ['leurres', 'vif'],
  maquereau: ['leurres', 'flottante'],
  sar: ['surfcasting', 'flottante'],
  orphie: ['flottante', 'leurres'],
}

/** Départements où l'espèce est réellement pêchable du bord. */
function speciesDepartments(species: SpeciesSlug): string[] {
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

/** Toutes les pages valides (nationales + départementales). */
export function getAllProgrammaticPages(): ProgrammaticPage[] {
  const pages: ProgrammaticPage[] = []
  for (const species of Object.keys(SPECIES) as SpeciesSlug[]) {
    const depts = speciesDepartments(species)
    for (const technique of SPECIES_TECHNIQUES[species]) {
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

  if (!(techniqueSlug in TECHNIQUES)) return null
  const technique = techniqueSlug as TechniqueSlug
  if (!SPECIES_TECHNIQUES[species].includes(technique)) return null

  if (!deptSlug) return { species, technique, deptCode: null }

  const deptCode = SLUG_TO_DEPARTMENT[deptSlug]
  if (!deptCode || !speciesDepartments(species).includes(deptCode)) return null
  return { species, technique, deptCode }
}

export function programmaticUrl(p: ProgrammaticPage): string {
  const base = `/peche/${p.species}/${p.technique}`
  return p.deptCode ? `${base}/${DEPARTMENT_SLUGS[p.deptCode]}` : base
}

export function programmaticTitle(p: ProgrammaticPage): string {
  const species = SPECIES[p.species].label
  const technique = TECHNIQUES[p.technique].withArticle
  if (!p.deptCode) return `Pêche du ${species.toLowerCase()} ${technique} en France`
  const dept = DEPARTMENT_LABELS[p.deptCode] ?? p.deptCode
  // « dans le Finistère », « dans les Landes », « en Vendée »…
  return `Pêche du ${species.toLowerCase()} ${technique} ${deptPreposition(p.deptCode)}${dept}`
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
