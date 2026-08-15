'use client'

import { useEffect, useState } from 'react'

/**
 * `true` tant que le bandeau de consentement est RÉELLEMENT à l'écran.
 *
 * ⚠️ SPRINT 81, Bloc 2 (décision John du 15/08 : **le bandeau reste**, il doit
 * juste cesser de manger l'écran). Mesuré en production le 15/08 en 390 × 664 :
 * la colonne de boutons flottants (124 px), la barre d'inscription (150 px) et
 * le bandeau de consentement (191 px) s'empilent **sans se recouvrir** depuis le
 * sprint 79, mais occupent ensemble **489 px sur 664, soit 74 % de l'écran**. Il
 * restait 175 px de carte. Rien n'était caché ; il n'y avait plus de place.
 *
 * La règle retenue : **une sollicitation à la fois**. Le bandeau de consentement
 * d'abord, la barre d'inscription seulement après sa réponse.
 *
 * ⚠️ Pourquoi on observe `data-consent-pending` sur `<html>` plutôt que de relire
 * le cookie : cet attribut est posé par `CookieBanner` **au moment où il rend
 * vraiment**, donc il porte exactement « le bandeau est visible ». Relire le
 * cookie donnerait un faux positif partout où le bandeau ne s'affiche pas (pas
 * de clé PostHog, par exemple), et masquerait la barre d'inscription pour rien.
 *
 * ⚠️ Et pourquoi ça ne se fait PAS en CSS : masquer en `display:none` laisserait
 * le composant monté, donc `signup_wall_viewed` partirait pour une barre que
 * personne ne voit. Le témoin du sprint 79 gonflerait dans le sens flatteur.
 * On démonte, on ne masque pas.
 */
export function useConsentBannerVisible(): boolean {
  // `false` au rendu serveur et au premier rendu client : sans ça, la barre
  // clignoterait à chaque chargement chez les visiteurs déjà décidés.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const read = () => setVisible(root.dataset.consentPending === '1')

    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['data-consent-pending'] })
    return () => observer.disconnect()
  }, [])

  return visible
}
