// Consentement analytics (RGPD) — cookie 1ère partie, source de vérité partagée
// entre le bandeau (components/consent/CookieBanner) et le provider PostHog
// (components/analytics/PostHogProvider).
//
// Tant que le choix n'est pas fait, on reste en opt-out (aucune capture).

export const CONSENT_COOKIE = 'cdp-analytics-consent'
export const CONSENT_MAX_AGE_DAYS = 180 // ~6 mois

export type ConsentValue = 'granted' | 'denied' | null

/** Lit le choix de consentement depuis le cookie (no-op / null en SSR). */
export function readConsent(): ConsentValue {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`))
  if (!match) return null
  const value = match.slice(CONSENT_COOKIE.length + 1)
  return value === 'granted' || value === 'denied' ? value : null
}

/** Écrit le choix dans un cookie 1ère partie (SameSite=Lax). */
export function writeConsent(value: 'granted' | 'denied'): void {
  if (typeof document === 'undefined') return
  const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}
