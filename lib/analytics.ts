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
  /**
   * Mur d'INSCRIPTION affiché à un visiteur anonyme (sprint 75, Bloc 1).
   * Strictement DISTINCT de `paywall_viewed`, qui reste réservé aux inscrits
   * gratuits : sans cette séparation, on ne peut pas savoir si le trafic SEO
   * bute sur « crée un compte » ou sur « paie un abonnement ».
   * `surface` = identifiant stable (cf SIGNUP_WALL_SURFACES dans lib/gating/wall).
   */
  signupWallViewed(props: { surface: string }): void {
    capture('signup_wall_viewed', props)
  },
  /** Clic sur le CTA d'un mur d'inscription (vers /auth/register). */
  signupWallClicked(props: { surface: string }): void {
    capture('signup_wall_clicked', props)
  },
  /**
   * Clic sur un CTA produit d'une fiche espèce (sprint 75, Bloc 5). `position`
   * distingue le CTA contextuel précoce du sticky et du pied de page : c'est
   * exactement ce qu'on cherche à savoir (l'ancien CTA était ligne 478 sur 494
   * et n'était jamais atteint sur mobile).
   */
  speciesPageCtaClicked(props: {
    species: string
    position: 'inline' | 'sticky' | 'footer'
  }): void {
    capture('species_page_cta_clicked', props)
  },
  /**
   * Clic d'une fiche espèce vers une fiche spot (sprint 75, Bloc 5). Mesure le
   * PONT du sprint : /especes (36 % des impressions, 1,7 % de CTR) doit alimenter
   * /spots (8,4 % de CTR). `spot_slug` est un identifiant public, jamais une coord.
   */
  speciesToSpotClicked(props: { species: string; spot_slug: string }): void {
    capture('species_to_spot_clicked', props)
  },
  /**
   * Clic d'une fiche spot vers une AUTRE fiche spot (sprint 76, Bloc 10). Mesure
   * le maillage horizontal ouvert ce sprint : 54 % des sessions ne voyaient
   * qu'une seule page, faute de lien entre les 416 fiches. Les deux slugs sont
   * des identifiants publics, jamais une coordonnée.
   */
  spotToSpotClicked(props: { from_slug: string; to_slug: string }): void {
    capture('spot_to_spot_clicked', props)
  },
  // ── Inscription différée (sprint 77, Bloc 7) ────────────────────────────────
  // On mesure le GESTE d'un visiteur sans compte, puis sa transformation en
  // ligne réelle au rejeu (`pending_replayed`, émis côté serveur). Zéro PII :
  // uniquement des compteurs et une surface. Le slug du spot n'est pas envoyé,
  // un spot mis de côté est une information de pêcheur.
  /** Un visiteur anonyme met un spot de côté. `count` = total en brouillon. */
  pendingFavoriteCreated(props: { count: number }): void {
    capture('pending_favorite_created', props)
  },
  /** Un visiteur anonyme a rempli une prise et l'a gardée en brouillon. */
  pendingCatchStarted(props: { species: string; technique: string }): void {
    capture('pending_catch_started', props)
  },

  /** Clic sur un CTA de la home (conversion funnel). `cta` = identifiant du bouton. */
  homeCtaClicked(props: { cta: string }): void {
    capture('home_cta_clicked', props)
  },
  /**
   * Affichage de la landing SEO « déclarer ses prises » (wedge RecFishing, sprint 73).
   * `utm*` = attribution de campagne (jamais de PII). Champs omis si absents de l'URL.
   */
  landingRecfishingViewed(props: {
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }): void {
    capture('landing_recfishing_viewed', props)
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
