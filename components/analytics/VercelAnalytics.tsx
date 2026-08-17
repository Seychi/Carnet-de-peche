'use client'

import { Analytics } from '@vercel/analytics/next'
import { readConsent } from '@/lib/consent'

// Vercel Web Analytics, branché SOUS le consentement (sprint 83, après passage Pro).
//
// ⚠️ Pourquoi ce wrapper existe au lieu d'un `<Analytics />` nu dans le layout :
// `lib/consent.ts` pose un invariant explicite pour tout le projet, « tant que le
// choix n'est pas fait, on reste en opt-out (aucune capture) ». C'est la posture
// tenue depuis le sprint 26 pour PostHog et durcie au sprint 81. Monter le composant
// tel que la documentation Vercel le montre enverrait un relevé de page vue AVANT
// que le bandeau ait été vu, donc à un visiteur qui n'a rien accepté, et à un
// visiteur qui a explicitement refusé.
//
// `beforeSend` est le point d'extension prévu par le paquet : il est appelé avant
// CHAQUE envoi, et renvoyer `null` annule l'événement. Comme `readConsent()` relit
// le cookie à l'appel, un visiteur qui accepte en cours de visite est pris en compte
// immédiatement, sans remontage du composant.
//
// Vercel Web Analytics est agrégé et sans cookie, donc son ajout ne change pas la
// nature des données traitées. Il ajoute en revanche un sous-traitant : il doit être
// nommé dans la politique de confidentialité.
export function VercelAnalytics() {
  return <Analytics beforeSend={(event) => (readConsent() === 'granted' ? event : null)} />
}
