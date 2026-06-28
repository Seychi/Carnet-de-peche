export const COASTAL_DEPARTMENTS: readonly string[] = [
  // Manche / Atlantique
  '14', // Calvados
  '17', // Charente-Maritime
  '22', // Côtes-d'Armor
  '29', // Finistère
  '33', // Gironde
  '35', // Ille-et-Vilaine
  '40', // Landes
  '44', // Loire-Atlantique
  '50', // Manche
  '56', // Morbihan
  '59', // Nord
  '62', // Pas-de-Calais
  '64', // Pyrénées-Atlantiques
  '76', // Seine-Maritime
  '85', // Vendée
  // Méditerranée
  '06', // Alpes-Maritimes
  '11', // Aude
  '13', // Bouches-du-Rhône
  '30', // Gard
  '34', // Hérault
  '66', // Pyrénées-Orientales
  '83', // Var
  '2A', // Corse-du-Sud
  '2B', // Haute-Corse
] as const

export function isCoastalDepartment(dept: string): boolean {
  return COASTAL_DEPARTMENTS.includes(dept)
}

export const DEPARTMENT_LABELS: Record<string, string> = {
  '14': 'Calvados',
  '17': 'Charente-Maritime',
  '22': "Côtes-d'Armor",
  '29': 'Finistère',
  '33': 'Gironde',
  '35': 'Ille-et-Vilaine',
  '40': 'Landes',
  '44': 'Loire-Atlantique',
  '50': 'Manche',
  '56': 'Morbihan',
  '59': 'Nord',
  '62': 'Pas-de-Calais',
  '64': 'Pyrénées-Atlantiques',
  '76': 'Seine-Maritime',
  '85': 'Vendée',
  '06': 'Alpes-Maritimes',
  '11': 'Aude',
  '13': 'Bouches-du-Rhône',
  '30': 'Gard',
  '34': 'Hérault',
  '66': 'Pyrénées-Orientales',
  '83': 'Var',
  '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse',
}

/**
 * Liste { code, label } prête pour les <select> (onboarding étape 2 + profil).
 * Source unique : COASTAL_DEPARTMENTS / DEPARTMENT_LABELS ci-dessus.
 * Tri : numérique croissant puis Corse (2A, 2B) en fin.
 */
export const DEPARTMENT_OPTIONS: { code: string; label: string }[] =
  [...COASTAL_DEPARTMENTS]
    .sort((a, b) => {
      // ⚠️ parseInt('2A') = 2 (pas NaN) → on teste explicitement le format
      // purement numérique. Les codes Corse (2A/2B) passent en fin de liste.
      const na = /^\d+$/.test(a) ? parseInt(a, 10) : Number.POSITIVE_INFINITY
      const nb = /^\d+$/.test(b) ? parseInt(b, 10) : Number.POSITIVE_INFINITY
      if (na === nb) return a.localeCompare(b) // 2A < 2B
      return na - nb
    })
    .map((code) => ({ code, label: `${code} — ${DEPARTMENT_LABELS[code]}` }))

/**
 * Région administrative par département côtier — utilisée pour remplir
 * `spots.region` (NOT NULL) lors d'une proposition community (lib/spots) ou
 * d'un import OSM (scripts/import-osm-spots.ts). Source unique.
 */
export const DEPARTMENT_REGION: Record<string, string> = {
  '14': 'Normandie',
  '50': 'Normandie',
  '76': 'Normandie',
  '59': 'Hauts-de-France',
  '62': 'Hauts-de-France',
  '22': 'Bretagne',
  '29': 'Bretagne',
  '35': 'Bretagne',
  '56': 'Bretagne',
  '44': 'Pays de la Loire',
  '85': 'Pays de la Loire',
  '17': 'Nouvelle-Aquitaine',
  '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine',
  '64': 'Nouvelle-Aquitaine',
  '11': 'Occitanie',
  '30': 'Occitanie',
  '34': 'Occitanie',
  '66': 'Occitanie',
  '06': 'Provence-Alpes-Côte d’Azur',
  '13': 'Provence-Alpes-Côte d’Azur',
  '83': 'Provence-Alpes-Côte d’Azur',
  '2A': 'Corse',
  '2B': 'Corse',
}

export function regionForDepartment(dept: string): string {
  return DEPARTMENT_REGION[dept.trim()] ?? ''
}

// ── Adjacence des départements côtiers (sprint 50, co-pêchage v2) ─────────────
// Frontières TERRESTRES réelles (source INSEE), restreintes aux 24 départements
// côtiers de COASTAL_DEPARTMENTS : un voisin inland (53 Mayenne, 27 Eure, 80
// Somme, etc.) n'apparaît jamais. Sert UNIQUEMENT à élargir le matching co-pêchage
// au(x) département(s) limitrophe(s) quand l'utilisateur le demande (includeNeighbors).
// AUCUNE coordonnée : on ne manipule que des codes de département.
//
// INVARIANT testé (departments.test.ts) : relation SYMÉTRIQUE (si A voisin de B,
// alors B voisin de A) et toutes les clés + valeurs sont des départements côtiers.
//
// Cas isolés assumés : 76 (Seine-Maritime) n'a aucun voisin côtier de la liste
// (ses voisins terrestres 80/60/27 sont inland) → tableau vide, includeNeighbors
// ne l'élargit pas. Idem pour les bouts de chaîne (64, 66, 59).
export const DEPARTMENT_ADJACENCY: Record<string, string[]> = {
  // Manche / Atlantique (du nord au sud)
  '59': ['62'], // Nord ↔ Pas-de-Calais
  '62': ['59'], // Pas-de-Calais ↔ Nord (80 Somme = inland, exclu)
  '76': [], // Seine-Maritime : voisins 80/60/27 tous inland → isolé
  '14': ['50'], // Calvados ↔ Manche (27 Eure inland entre 14 et 76)
  '50': ['14', '35'], // Manche ↔ Calvados, Ille-et-Vilaine
  '35': ['50', '22', '56', '44'], // Ille-et-Vilaine ↔ Manche, Côtes-d'Armor, Morbihan, Loire-Atlantique
  '22': ['29', '56', '35'], // Côtes-d'Armor ↔ Finistère, Morbihan, Ille-et-Vilaine
  '29': ['22', '56'], // Finistère ↔ Côtes-d'Armor, Morbihan
  '56': ['29', '22', '35', '44'], // Morbihan ↔ Finistère, Côtes-d'Armor, Ille-et-Vilaine, Loire-Atlantique
  '44': ['56', '35', '85'], // Loire-Atlantique ↔ Morbihan, Ille-et-Vilaine, Vendée
  '85': ['44', '17'], // Vendée ↔ Loire-Atlantique, Charente-Maritime
  '17': ['85', '33'], // Charente-Maritime ↔ Vendée, Gironde
  '33': ['17', '40'], // Gironde ↔ Charente-Maritime, Landes
  '40': ['33', '64'], // Landes ↔ Gironde, Pyrénées-Atlantiques
  '64': ['40'], // Pyrénées-Atlantiques ↔ Landes
  // Méditerranée (de l'est à l'ouest)
  '06': ['83'], // Alpes-Maritimes ↔ Var
  '83': ['06', '13'], // Var ↔ Alpes-Maritimes, Bouches-du-Rhône
  '13': ['83', '30'], // Bouches-du-Rhône ↔ Var, Gard
  '30': ['13', '34'], // Gard ↔ Bouches-du-Rhône, Hérault
  '34': ['30', '11'], // Hérault ↔ Gard, Aude
  '11': ['34', '66'], // Aude ↔ Hérault, Pyrénées-Orientales
  '66': ['11'], // Pyrénées-Orientales ↔ Aude
  // Corse
  '2A': ['2B'], // Corse-du-Sud ↔ Haute-Corse
  '2B': ['2A'], // Haute-Corse ↔ Corse-du-Sud
}

/**
 * Départements côtiers limitrophes d'un département donné (frontière terrestre
 * réelle, sources INSEE). Tableau vide si le code est inconnu ou isolé. Fonction
 * PURE — testée. AUCUNE coordonnée.
 */
export function neighborDepartments(dept: string): string[] {
  return DEPARTMENT_ADJACENCY[dept?.trim() ?? ''] ?? []
}

// ── Article + préposition par département (Bloc B, sprint 31) ──────────────────
// Pour coller le BON article au nom : « du Finistère », « des Landes »,
// « de l'Hérault » (prep 'de') / « dans le Finistère », « dans les Landes »,
// « dans l'Hérault » (prep 'dans'). Fini le « du Alpes-Maritimes » fautif des
// titres /fil et sous-titres /sorties (audit 2026-06-25 #3).
// Une catégorie unique par département côtier :
//   'm'       = masculin singulier  → du / dans le
//   'f'       = féminin singulier   → de la / dans la
//   'pl'      = pluriel             → des / dans les
//   'elision' = voyelle / h muet    → de l' / dans l'  (genre indifférent)
// Source unique, PURE et testée (lib/geo/__tests__/departments.test.ts).
type DeptGrammar = 'm' | 'f' | 'pl' | 'elision'

const DEPARTMENT_GRAMMAR: Record<string, DeptGrammar> = {
  '14': 'm', // le Calvados
  '17': 'f', // la Charente-Maritime
  '22': 'pl', // les Côtes-d'Armor
  '29': 'm', // le Finistère
  '33': 'f', // la Gironde
  '35': 'elision', // l'Ille-et-Vilaine
  '40': 'pl', // les Landes
  '44': 'f', // la Loire-Atlantique
  '50': 'f', // la Manche
  '56': 'm', // le Morbihan
  '59': 'm', // le Nord
  '62': 'm', // le Pas-de-Calais
  '64': 'pl', // les Pyrénées-Atlantiques
  '76': 'f', // la Seine-Maritime
  '85': 'f', // la Vendée
  '06': 'pl', // les Alpes-Maritimes
  '11': 'elision', // l'Aude
  '13': 'pl', // les Bouches-du-Rhône
  '30': 'm', // le Gard
  '34': 'elision', // l'Hérault
  '66': 'pl', // les Pyrénées-Orientales
  '83': 'm', // le Var
  '2A': 'f', // la Corse-du-Sud
  '2B': 'f', // la Haute-Corse
}

const ARTICLE_PREFIX: Record<'de' | 'dans', Record<DeptGrammar, string>> = {
  de: { m: 'du ', f: 'de la ', pl: 'des ', elision: "de l'" },
  dans: { m: 'dans le ', f: 'dans la ', pl: 'dans les ', elision: "dans l'" },
}

/**
 * Article + préposition correctement accordés, COLLÉS au nom du département.
 * `prep` = 'de' → « du Finistère », « des Landes », « de l'Hérault »,
 *                  « de la Corse-du-Sud ».
 * `prep` = 'dans' → « dans le Finistère », « dans les Landes », « dans l'Hérault »,
 *                    « dans la Corse-du-Sud ».
 * Fallback prudent pour un code hors liste côtière : on n'invente jamais d'article
 * fautif (« de <nom> » au pire, ou le code brut) plutôt qu'un « undefined » à l'écran.
 * Fonction PURE — testée.
 */
export function departmentArticle(code: string, prep: 'de' | 'dans'): string {
  const key = code?.trim() ?? ''
  const name = DEPARTMENT_LABELS[key]
  const grammar = DEPARTMENT_GRAMMAR[key]
  if (!name) return key
  if (!grammar) return `${prep} ${name}`
  return `${ARTICLE_PREFIX[prep][grammar]}${name}`
}
