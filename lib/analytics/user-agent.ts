/**
 * Propriétés d'appareil dérivées du User-Agent, pour les événements émis CÔTÉ
 * SERVEUR (sprint 79, Bloc 0).
 *
 * ⚠️ Pourquoi ça existe. `signup_completed` (27 sur 90 j) et `onboarding_finished`
 * (21) partent d'une Server Action : ils arrivaient donc dans PostHog SANS
 * `$device_type`. Or un funnel filtré sur `$device_type = Mobile` filtre sur une
 * propriété d'ÉVÉNEMENT : la dernière étape ne pouvait jamais se conclure, et
 * « 0 compte mobile en 90 jours » était en partie un artefact de mesure. On ne
 * peut pas évaluer un correctif mobile avec un funnel qui ne peut pas finir.
 *
 * On calcule ici plutôt que de compter sur l'enrichissement de PostHog : une
 * propriété envoyée explicitement est toujours celle qui fait foi, et on ne
 * dépend pas d'un comportement d'ingestion qu'on ne maîtrise pas.
 *
 * ⚠️ RGPD : trois propriétés TECHNIQUES, pas un profil. Aucune donnée
 * identifiante n'est ajoutée, `person_profiles: 'identified_only'` reste tel quel.
 * Le User-Agent brut n'est pas transmis (il est plus discriminant que ce dont on
 * a besoin, et on n'a besoin que de la famille d'appareil).
 */

export type DeviceProps = {
  $device_type: 'Mobile' | 'Tablet' | 'Desktop'
  $os: string
  $browser: string
}

/**
 * Même vocabulaire que le SDK navigateur de PostHog (`Mobile` / `Tablet` /
 * `Desktop`), sinon les événements serveur et client ne se filtrent pas ensemble
 * et le funnel se coupe quand même, juste plus discrètement.
 */
export function devicePropsFromUserAgent(userAgent: string | null | undefined): DeviceProps | null {
  if (!userAgent) return null
  const ua = userAgent

  // L'ordre compte : un iPad annonce « Macintosh » sur iPadOS ≥ 13, et Edge
  // annonce « Chrome », et Chrome annonce « Safari ». On teste du plus
  // spécifique au plus générique.
  const isTablet = /iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
  const isMobile =
    !isTablet && (/Mobi|iPhone|iPod|Android|Windows Phone|IEMobile/i.test(ua))

  const os = /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
      ? 'Android'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'Mac OS X'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Other'

  const browser = /Edg\//i.test(ua)
    ? 'Microsoft Edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'Opera'
      : /Firefox\/|FxiOS/i.test(ua)
        ? 'Firefox'
        : /CriOS/i.test(ua)
          ? 'Chrome iOS'
          : /Chrome\//i.test(ua)
            ? 'Chrome'
            : /Safari\//i.test(ua)
              ? 'Safari'
              : 'Other'

  return {
    $device_type: isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop',
    $os: os,
    $browser: browser,
  }
}
