// Helper « récap hebdo » (sprint 49 « Push & engagement », émetteur weekly-digest, WS B).
//
// Greffé dans un cron existant (personal-window, ~07:00) un seul jour de semaine →
// 1×/semaine. La COMPOSITION est pure (composeWeeklyDigest) ; la lecture des prises se
// fait en service_role dans le cron (pas de session user → on ne peut pas réutiliser
// getMyCatchStats, RPC scopée auth.uid()). On lit donc directement les prises de
// l'utilisateur via le client admin, sur la fenêtre des 7 derniers jours.
//
// INVARIANTS :
// - DESCRIPTIF : on rapporte des faits du carnet (N prises, la plus belle), jamais une
//   prédiction. Les « fenêtres à venir » sont les créneaux solunar du département
//   (réutilise le pipeline caché, zéro appel réseau en plus dans le run).
// - Copie SANS tiret cadratin.

import { SPECIES_BY_DB_KEY, SPECIES } from '@/lib/seo/programmatic'

/** Une prise minimale pour le digest (lue en service_role dans le cron). */
export type DigestCatchRow = {
  species: string | null
  size_cm: number | null
  measured_length_cm: number | null
}

export type WeeklyDigestInput = {
  /** Prises des 7 derniers jours (déjà filtrées par date côté requête). */
  catches: DigestCatchRow[]
  /** Nombre de fenêtres favorables à venir (cette semaine) pour le département. */
  upcomingWindowsCount: number
}

export type WeeklyDigest = {
  count: number
  /** Libellé FR de la plus belle prise (« bar de 62 cm »), ou null si aucune taille. */
  best: string | null
  previewText: string
}

/**
 * Compose le récap hebdo (pur, testable). Renvoie null s'il n'y a STRICTEMENT rien à
 * dire (0 prise ET 0 fenêtre à venir) → on n'envoie pas un digest vide.
 */
export function composeWeeklyDigest(input: WeeklyDigestInput): WeeklyDigest | null {
  const count = input.catches.length
  const upcoming = Math.max(0, input.upcomingWindowsCount)

  if (count === 0 && upcoming === 0) return null

  // Plus belle prise = plus grande taille loguée (size_cm ou measured_length_cm).
  let bestLabel: string | null = null
  let bestSize = 0
  for (const c of input.catches) {
    const size = Math.max(c.size_cm ?? 0, c.measured_length_cm ?? 0)
    if (size > bestSize) {
      bestSize = size
      bestLabel = formatBestCatch(c.species, size)
    }
  }

  // Composition de la phrase, en n'incluant que les segments pertinents.
  const parts: string[] = []
  if (count > 0) {
    parts.push(count === 1 ? '1 prise cette semaine' : `${count} prises cette semaine`)
  } else {
    parts.push('Pas de prise cette semaine')
  }
  if (bestLabel) parts.push(`ta plus belle : ${bestLabel}`)
  if (upcoming > 0) {
    parts.push(
      upcoming === 1
        ? '1 bon créneau à venir'
        : `${upcoming} bons créneaux à venir`,
    )
  }

  const previewText = `Ta semaine : ${parts.join(', ')}.`

  return { count, best: bestLabel, previewText }
}

/** « bar de 62 cm » à partir du dbKey d'espèce et d'une taille (cm). */
function formatBestCatch(speciesDbKey: string | null, sizeCm: number): string {
  const rounded = Math.round(sizeCm)
  const label = speciesLabelLower(speciesDbKey)
  return label ? `${label} de ${rounded} cm` : `${rounded} cm`
}

/** Libellé minuscule FR d'une espèce depuis son dbKey, ou null si inconnu. */
function speciesLabelLower(speciesDbKey: string | null): string | null {
  if (!speciesDbKey) return null
  const slug = SPECIES_BY_DB_KEY[speciesDbKey]
  return slug ? SPECIES[slug].labelLower : null
}
