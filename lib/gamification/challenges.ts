import {
  checkSize,
  isClosedSeason,
  getFacadeForCatch,
  resolveSpeciesSlug,
} from '@/lib/regulation'
import { isDeclarable, RECFISHING_LINKS } from '@/lib/regulation/recfishing'

// ─── Défis conservation (G3, non-compétitifs) ──────────────────────────────────
// Décision John D-F4 : défis CONSERVATION liés à RecFishing, JAMAIS de comparaison.
// Calculés SUR LECTURE en TS depuis les prises + lib/regulation (la réglementation
// vit en TS, pas en SQL → on ne persiste rien, on ne peut pas tricher/dériver).
//
// Pont clé : `catch.species` = clé DB snake_case → slug via resolveSpeciesSlug AVANT
// d'appeler la réglementation. Façade résolue depuis le département/géoloc de la prise.
// JAMAIS de verdict réglementaire si la façade est inconnue (null) → la prise est
// simplement ignorée pour les défis qui dépendent de la maille/fermeture (honnête).

export type ChallengeCatch = {
  /** Clé DB snake_case (catches.species). */
  species: string | null
  released: boolean | null
  size_cm: number | null
  caught_at: string | null
  /** Département du spot rattaché (catches_for_viewer.department). */
  department: string | null
  /** Géoloc visible (repli façade si pas de département). */
  lat: number | null
  lng: number | null
  /** Horodatage « prise mesurée » (066) — sert au calcul des métriques de badge. */
  photo_verified_at?: string | null
}

export type ChallengeSlug = 'release_undersize' | 'respect_closures' | 'declare_sensitive'

export type ChallengeDef = {
  slug: ChallengeSlug
  title: string
  /** Phrase descriptive, jamais une promesse de résultat. */
  description: string
  icon: 'fish' | 'calendar-off' | 'clipboard-check'
  /** Lien externe optionnel (ex. RecFishing) proposé quand le défi est pertinent. */
  link?: { label: string; href: string }
}

export const CHALLENGES: ChallengeDef[] = [
  {
    slug: 'release_undersize',
    title: 'Relâche tes sous-tailles',
    description:
      'Quand une prise est sous la maille, la remettre à l’eau aide la ressource à se renouveler.',
    icon: 'fish',
  },
  {
    slug: 'respect_closures',
    title: 'Respecte les fermetures',
    description:
      'Certaines espèces sont protégées une partie de l’année : ne rien prélever pendant une fermeture, c’est jouer le jeu.',
    icon: 'calendar-off',
  },
  {
    slug: 'declare_sensitive',
    title: 'Déclare tes prises sensibles',
    description:
      'Bar, lieu jaune, maquereau… doivent être déclarés sous 24 h via RecFishing, même relâchés.',
    icon: 'clipboard-check',
    link: { label: 'Ouvrir RecFishing', href: RECFISHING_LINKS.webPortal },
  },
]

export type ChallengeProgress = {
  slug: ChallengeSlug
  /** Numérateur : prises « bien jouées » pour ce défi. */
  done: number
  /** Dénominateur : prises CONCERNÉES par ce défi (façade connue + situation pertinente). */
  total: number
  /** true dès qu'au moins une prise est concernée ET toutes sont bien jouées. */
  complete: boolean
}

/**
 * Calcule la progression des 3 défis depuis les prises du carnet.
 *
 * - release_undersize : parmi les prises SOUS LA MAILLE (undersize), combien relâchées ?
 * - respect_closures  : parmi les prises faites pendant une fermeture DURE (strictlyClosed),
 *   combien NON prélevées (released=true) ? (prélever pendant une fermeture = manqué)
 * - declare_sensitive : parmi les prises d'espèces déclarables RecFishing, c'est un RAPPEL
 *   d'action (on ne sait pas si l'utilisateur a déclaré hors app) → `done` = 0, `total` =
 *   nombre de prises concernées ; le composant invite à ouvrir RecFishing. Honnête : on ne
 *   prétend jamais avoir déclaré à sa place.
 *
 * Les prises à façade inconnue sont ignorées pour les défis réglementaires (pas de verdict faux).
 */
export function computeChallengeProgress(catches: ChallengeCatch[]): ChallengeProgress[] {
  let undersizeTotal = 0
  let undersizeReleased = 0
  let closureTotal = 0
  let closureRespected = 0
  let declarableTotal = 0

  for (const c of catches) {
    const facade = getFacadeForCatch({ department: c.department, lat: c.lat, lng: c.lng })
    if (facade == null) continue // façade inconnue → aucun verdict réglementaire

    const slug = resolveSpeciesSlug(c.species)
    if (!slug) continue // espèce inconnue → on ne tranche pas

    // ── Défi 1 : sous-tailles relâchées ──────────────────────────────────────
    if (typeof c.size_cm === 'number') {
      const verdict = checkSize(c.species, facade, c.size_cm)
      if (verdict.status === 'undersize') {
        undersizeTotal++
        if (c.released === true) undersizeReleased++
      }
    }

    // ── Défi 2 : fermetures respectées (prélèvement interdit) ─────────────────
    if (c.caught_at) {
      const closed = isClosedSeason(c.species, facade, new Date(c.caught_at))
      if (closed.strictlyClosed) {
        closureTotal++
        // « Respecté » = non prélevé (relâché) pendant la fermeture dure.
        if (c.released === true) closureRespected++
      }
    }

    // ── Défi 3 : espèces sensibles à déclarer (rappel) ───────────────────────
    if (isDeclarable(c.species, facade)) {
      declarableTotal++
    }
  }

  return [
    {
      slug: 'release_undersize',
      done: undersizeReleased,
      total: undersizeTotal,
      complete: undersizeTotal > 0 && undersizeReleased === undersizeTotal,
    },
    {
      slug: 'respect_closures',
      done: closureRespected,
      total: closureTotal,
      complete: closureTotal > 0 && closureRespected === closureTotal,
    },
    {
      slug: 'declare_sensitive',
      // On ne peut pas vérifier la déclaration hors app → done reste 0, c'est un rappel.
      done: 0,
      total: declarableTotal,
      complete: false,
    },
  ]
}
