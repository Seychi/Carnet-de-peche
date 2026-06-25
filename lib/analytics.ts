// Analytics CLIENT — wrapper PostHog (posthog-js), mode EU + opt-out par défaut.
//
// Règles produit (CLAUDE.md / invariants sprint 26) :
//  - AUCUNE PII : jamais d'email, de pseudo, de lat/lng ni de coords dans un event.
//  - Opt-out par défaut : la capture ne démarre QUE sur consentement (cookie),
//    géré par components/analytics/PostHogProvider.tsx → opt_in_capturing().
//  - No-op côté serveur (SSR) : posthog-js n'existe pas hors navigateur.
//  - On NE touche JAMAIS au gating : ces events sont purement additifs.
//
// L'init (host EU, person_profiles 'identified_only', capture_pageview false,
// opt_out_capturing_by_default true) vit dans PostHogProvider. Ici on se contente
// d'appeler l'instance déjà initialisée via l'import direct du SDK.

import posthog from 'posthog-js'

/** Capture sûre : no-op en SSR ou si PostHog n'est pas initialisé/clé absente. */
function capture(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  // __loaded passe à true après posthog.init(). Avant ça (clé absente, provider
  // pas monté), on ne fait rien plutôt que de jeter.
  if (!posthog.__loaded) return
  posthog.capture(event, props)
}

export const analytics = {
  // ── Carnet (existant — NE PAS changer la signature, appelé dans CatchForm) ──
  catchLogStarted(props: { source: 'web' | 'mobile' }): void {
    capture('catch_log_started', props)
  },
  catchLogCompleted(props: { species: string; technique: string; hasPhoto: boolean }): void {
    capture('catch_log_completed', props)
  },
  catchLogAbandoned(props: { lastFieldFocused: string }): void {
    capture('catch_log_abandoned', props)
  },

  // ── Tunnel de conversion (paywall / upsell / checkout) ──────────────────────
  /** Affichage d'une surface gatée (paywall vu). `surface` = identifiant d'écran. */
  paywallViewed(props: { surface: string }): void {
    capture('paywall_viewed', props)
  },
  /** Clic sur un CTA d'upsell menant vers /tarifs. */
  upsellClicked(props: { surface: string }): void {
    capture('upsell_clicked', props)
  },
  /** Clic sur un CTA de la home (conversion funnel). `cta` = identifiant du bouton. */
  homeCtaClicked(props: { cta: string }): void {
    capture('home_cta_clicked', props)
  },
  /** Soumission du CTA de Checkout (avant la redirection Stripe). */
  checkoutStarted(props: { plan: 'local' | 'itinerant'; interval: 'monthly' | 'annual' }): void {
    capture('checkout_started', props)
  },

  // ── Identité ────────────────────────────────────────────────────────────────
  /** Associe les events au userId Supabase (jamais l'email — pas de PII). */
  identify(userId: string): void {
    if (typeof window === 'undefined') return
    if (!posthog.__loaded) return
    posthog.identify(userId)
  },
  /** Déconnexion : casse le lien d'identité (nouvel anonyme). */
  reset(): void {
    if (typeof window === 'undefined') return
    if (!posthog.__loaded) return
    posthog.reset()
  },
  /** Pageview manuel (App Router : pas d'auto-capture, cf PostHogPageView). */
  capturePageview(url: string): void {
    capture('$pageview', { $current_url: url })
  },
}
