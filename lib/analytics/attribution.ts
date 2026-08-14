// Attribution d'ENTRÉE (sprint 76, Bloc 7).
//
// Le problème (démontré dans docs/sprint-76/research/attribution.md) : rien
// n'est capturé tant que le visiteur n'a pas accepté le bandeau, donc le
// `$pageview` d'entrée — le seul qui porte le referrer de Google — est perdu.
// Quand la capture démarre enfin, `document.referrer` vaut souvent une page
// interne : 42 % du trafic était classé en auto-référencement.
//
// ⚠️ GARDE-FOU RGPD, non négociable : ce module n'émet RIEN. Il ne fait
// qu'écrire dans le `sessionStorage` du visiteur (stockage 1ère partie, vidé à
// la fermeture de l'onglet). Aucune requête réseau, aucun cookie, aucune donnée
// personnelle : uniquement un referrer et des paramètres de campagne, qui sont
// déjà dans l'URL que le navigateur vient de charger.

const STORAGE_KEY = 'cdp-entry-attribution'

/** Paramètres de campagne repris tels quels par PostHog (`$utm_*` côté event). */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

export type EntryAttribution = {
  $referrer?: string
  $referring_domain?: string
} & Partial<Record<`$${(typeof UTM_KEYS)[number]}`, string>>

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

/**
 * Mémorise la source d'entrée au tout premier chargement de la session.
 * Idempotent : un rechargement ou une navigation interne n'écrase PAS la
 * première valeur, sinon on remplacerait Google par notre propre domaine, ce
 * qui est exactement le bug qu'on corrige.
 *
 * N'ÉMET RIEN. Peut être appelé avant tout consentement.
 */
export function rememberEntryAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) return

    const attribution: EntryAttribution = {}

    const referrer = document.referrer
    // Un referrer interne n'est pas une SOURCE d'entrée : on le laisse tomber
    // plutôt que de le mémoriser, sinon on fige l'auto-référencement.
    if (referrer && domainOf(referrer) !== window.location.hostname) {
      attribution.$referrer = referrer
      const domain = domainOf(referrer)
      if (domain) attribution.$referring_domain = domain
    }

    const params = new URLSearchParams(window.location.search)
    for (const key of UTM_KEYS) {
      const value = params.get(key)
      if (value) attribution[`$${key}`] = value
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch {
    // sessionStorage indisponible (mode privé strict, quota) : on renonce
    // silencieusement. L'attribution est un confort de mesure, jamais un bloquant.
  }
}

/**
 * Propriétés d'entrée à attacher au PREMIER `$pageview` capturé après
 * consentement. Renvoie un objet vide si rien n'a été mémorisé (entrée directe,
 * sessionStorage indisponible…) : PostHog retombe alors sur ses valeurs par défaut.
 */
export function readEntryAttribution(): EntryAttribution {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as EntryAttribution
  } catch {
    return {}
  }
}
