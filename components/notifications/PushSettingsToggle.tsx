'use client'

import { Check, X, BellOff, Smartphone } from 'lucide-react'
import { usePushSubscription } from '@/components/push/use-push-subscription'

// Interrupteur PRINCIPAL des notifications push (sprint 39, reformulé sprint 51 WS-E).
// C'est le maître on/off : il crée/supprime l'abonnement push réel (usePushSubscription).
// S'il est éteint, AUCUNE alerte n'arrive, quels que soient les réglages par type
// (NotificationTypeToggles). Avant le sprint 51 il était libellé « fenêtre optimale »
// (payant), ce qui décourageait les gratuits d'activer leurs push gratuits : corrigé.
// Modelé sur EmailPrefsToggle. Opt-in strict : l'action passe par subscribe()
// du hook WS B, qui déclenche la demande de permission sur ce geste utilisateur.
//
// Daltonisme : l'état n'est JAMAIS encodé par la seule couleur. On double par un
// libellé texte (« Activées » / « Désactivées »), une icône (✓ / ✗) et la position.
//
// Dégradation propre selon le support :
// - 'unsupported'   → message, pas de bouton mort.
// - 'ios-needs-pwa' → astuce « installe l'app sur ton écran d'accueil ».
// - permission 'denied' → on explique comment réactiver, pas de re-demande en boucle.
export function PushSettingsToggle() {
  const { support, permission, isSubscribed, busy, subscribe, unsubscribe } =
    usePushSubscription()

  const Row = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-navy-900">
          Notifications push
        </p>
        <p className="mt-1 text-xs text-ink-500 leading-relaxed">
          L&rsquo;interrupteur principal de tes alertes. S&rsquo;il est éteint, aucune
          notification n&rsquo;arrive, quels que soient tes réglages par type ci-dessous.
        </p>
      </div>
      {children}
    </div>
  )

  // Navigateur sans support push (ex. iOS Safari hors PWA non concerné ici, plutôt
  // navigateurs anciens) : pas de bouton, on l'explique.
  if (support === 'unsupported') {
    return (
      <Row>
        <span className="shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border border-ink-200 bg-white text-xs font-semibold text-ink-500">
          <BellOff size={14} strokeWidth={2.2} aria-hidden="true" />
          Indisponible ici
        </span>
      </Row>
    )
  }

  // iOS Safari : les push ne marchent qu'en PWA installée (iOS 16.4+).
  if (support === 'ios-needs-pwa') {
    return (
      <div className="space-y-2">
        <Row>
          <span className="shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border border-ink-200 bg-white text-xs font-semibold text-ink-500">
            <Smartphone size={14} strokeWidth={2.2} aria-hidden="true" />
            iPhone
          </span>
        </Row>
        <p className="rounded-[10px] bg-sand-100 px-3 py-2 text-xs text-ink-600 leading-relaxed">
          Sur iPhone, installe d&rsquo;abord l&rsquo;app sur ton écran d&rsquo;accueil
          (bouton Partager puis « Sur l&rsquo;écran d&rsquo;accueil »), puis reviens
          ici pour activer les alertes.
        </p>
      </div>
    )
  }

  // Permission refusée par le navigateur : on n'insiste pas, on explique le retour arrière.
  if (permission === 'denied' && !isSubscribed) {
    return (
      <div className="space-y-2">
        <Row>
          <span className="shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border border-ink-200 bg-white text-xs font-semibold text-ink-500">
            <BellOff size={14} strokeWidth={2.2} aria-hidden="true" />
            Bloquées
          </span>
        </Row>
        <p className="rounded-[10px] bg-sand-100 px-3 py-2 text-xs text-ink-600 leading-relaxed">
          Tu as bloqué les notifications pour ce site. Pour les réactiver, autorise
          les notifications dans les réglages de ton navigateur, puis reviens ici.
        </p>
      </div>
    )
  }

  // Cas nominal : bouton ON/OFF qui crée/supprime réellement l'abonnement.
  function toggle() {
    if (busy) return
    if (isSubscribed) {
      void unsubscribe()
    } else {
      void subscribe()
    }
  }

  return (
    <Row>
      <button
        type="button"
        role="switch"
        aria-checked={isSubscribed}
        aria-label="Notifications push"
        disabled={busy}
        onClick={toggle}
        className={`shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border text-xs font-semibold transition-colors duration-150 disabled:opacity-50 ${
          isSubscribed
            ? 'bg-teal-500 border-teal-500 text-navy-950'
            : 'bg-white border-ink-200 text-ink-600'
        }`}
      >
        {isSubscribed ? (
          <>
            <Check size={14} strokeWidth={2.4} aria-hidden="true" />
            Activées
          </>
        ) : (
          <>
            <X size={14} strokeWidth={2.4} aria-hidden="true" />
            Désactivées
          </>
        )}
      </button>
    </Row>
  )
}
