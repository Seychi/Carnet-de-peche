import { SPECIES, type Facade, type SpeciesSlug } from '@/lib/seo/programmatic'
import { resolveSpeciesSlug } from './index'

// ═══════════════════════════════════════════════════════════════════════════════
// RECFISHING — déclaration obligatoire des espèces sensibles (sprint 24, Chantier C).
//
// Depuis le 12/02/2026, la pêche de loisir en mer impose de déclarer sous 24 h
// certaines espèces « sensibles » via l'appli officielle UE RecFishing — Y COMPRIS
// les poissons relâchés (no-kill). Notre rôle : DÉTECTER, RAPPELER, PRÉ-REMPLIR le
// récap, et OUVRIR RecFishing. On NE déclare JAMAIS à la place du pêcheur :
// l'appli UE s'authentifie via EU Login, AUCUNE API tierce de soumission n'existe.
//
// ⚠️ Liste RÉVISÉE annuellement (a déjà bougé 2× en 2026) — à re-vérifier avant
// chaque mise en prod. Le thon rouge a été RETIRÉ de RecFishing le 01/04/2026
// (régime quota/autorisation propre) → volontairement absent.
// ═══════════════════════════════════════════════════════════════════════════════

export const RECFISHING_META = {
  verifiedAt: '23/06/2026',
  source: 'Arrêté du 7 nov. 2025 modifié par l’arrêté du 1er avril 2026 ; mer.gouv.fr (màj 22/05/2026)',
  // Délai légal de déclaration après la capture.
  deadlineHours: 24,
} as const

/** Liens pour ouvrir RecFishing (l'utilisateur déclare lui-même, via EU Login). */
export const RECFISHING_LINKS = {
  webPortal: 'https://fishers.recreational-fishing.ec.europa.eu/',
  programme: 'https://recreational-fishing.ec.europa.eu/',
  ios: 'https://apps.apple.com/fr/app/recfishing/id6746253374',
  android: 'https://play.google.com/store/apps/details?id=eu.europa.publications.recfishing',
} as const

/** Parcs marins de Méditerranée où c'est CatchMachine (Ifremer) qui s'applique, pas RecFishing. */
export const MED_MARINE_PARKS = [
  'Parc national des Calanques',
  'Parc naturel marin du Golfe du Lion',
  'Parc naturel marin du Cap Corse et de l’Agriate',
] as const

/**
 * Avertissement parc marin PERTINENT pour un département donné (sprint 24, suite QA).
 * Gaté par département pour rester EXACT : la maille dérogatoire « bar 42 cm » ne vaut
 * que dans le Golfe du Lion (Aude 11 + Pyrénées-Orientales 66), pas sur tout le littoral
 * méditerranéen. Hors département à parc → null (aucune note trompeuse). Sources :
 * arrêté préfectoral R93-2024-02-12-00002 du 12/02/2024 (Golfe du Lion) ; parcs Calanques
 * (13) et Cap Corse–Agriate (2B) = CatchMachine obligatoire.
 */
export function getMarineParkNotice(department: string | null | undefined): string | null {
  switch (department) {
    case '11':
    case '66':
      return 'Parc naturel marin du Golfe du Lion : mailles locales plus strictes (bar 42 cm, rouget/oblade 20 cm, pageot 25 cm) + autorisation via l’appli CatchMachine (pas RecFishing).'
    case '13':
      return 'Parc national des Calanques : déclaration des captures via l’appli CatchMachine (pas RecFishing).'
    case '2B':
      return 'Parc naturel marin du Cap Corse et de l’Agriate : déclaration des captures via l’appli CatchMachine (pas RecFishing).'
    default:
      return null
  }
}

export type SensitiveSpecies = {
  /** Nom scientifique (référence stable). */
  latin: string
  commonFr: string
  /** Façades où l'espèce est sensible (donc déclarable). */
  facades: Facade[]
  /** Slugs de NOTRE référentiel correspondant — vide si l'espèce n'est pas loggable chez nous. */
  matchSlugs: SpeciesSlug[]
}

/**
 * Liste officielle COURANTE (depuis l'arrêté du 1er avril 2026) des espèces
 * sensibles à déclarer sous 24 h. Atlantique/Manche/mer du Nord : bar, lieu jaune,
 * dorade rose (pageot rose), maquereau. Méditerranée : dorade rose, dorade coryphène.
 *
 * NB : « dorade rose » = Pagellus bogaraveo et « dorade coryphène » = Coryphaena
 * hippurus ne sont PAS dans notre carnet (notre `pageot` = Pagellus erythrinus,
 * espèce distincte) → `matchSlugs` vides : présents pour la complétude/affichage,
 * jamais déclenchés par une prise loguée tant qu'ils ne sont pas au référentiel.
 */
export const RECFISHING_SENSITIVE: SensitiveSpecies[] = [
  { latin: 'Dicentrarchus labrax', commonFr: 'Bar (commun)', facades: ['manche-atlantique'], matchSlugs: ['bar'] },
  { latin: 'Pollachius pollachius', commonFr: 'Lieu jaune', facades: ['manche-atlantique'], matchSlugs: ['lieu-jaune'] },
  { latin: 'Scomber scombrus', commonFr: 'Maquereau (commun)', facades: ['manche-atlantique'], matchSlugs: ['maquereau'] },
  {
    latin: 'Pagellus bogaraveo',
    commonFr: 'Dorade rose (pageot rose)',
    facades: ['manche-atlantique', 'mediterranee'],
    matchSlugs: [],
  },
  { latin: 'Coryphaena hippurus', commonFr: 'Dorade coryphène (mahi-mahi)', facades: ['mediterranee'], matchSlugs: [] },
]

/** Entrée sensible correspondant à une prise (espèce + façade), ou null. */
export function getDeclarableInfo(
  speciesKey: string | null | undefined,
  facade: Facade,
): SensitiveSpecies | null {
  const slug = resolveSpeciesSlug(speciesKey)
  if (!slug) return null
  return (
    RECFISHING_SENSITIVE.find((s) => s.matchSlugs.includes(slug) && s.facades.includes(facade)) ?? null
  )
}

/** true si une prise de cette espèce sur cette façade doit être déclarée sous 24 h (no-kill inclus). */
export function isDeclarable(speciesKey: string | null | undefined, facade: Facade): boolean {
  return getDeclarableInfo(speciesKey, facade) !== null
}

/** Clés DB des espèces potentiellement déclarables (toutes façades) — prefiltre cron/notifs. */
export const DECLARABLE_DB_KEYS: string[] = Array.from(
  new Set(RECFISHING_SENSITIVE.flatMap((s) => s.matchSlugs).map((slug) => SPECIES[slug].dbKey)),
)
