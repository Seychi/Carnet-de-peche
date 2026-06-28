'use client'

import Link from 'next/link'
import { Bell, BellRing, Lock, Smartphone } from 'lucide-react'
import type { UserTier } from '@/lib/auth/tier'
import { usePushSubscription } from './use-push-subscription'

// Opt-in contextuel des alertes « fenêtre optimale » (sprint 39, WS B).
// Affiché APRÈS la 1ʳᵉ prise (pas à froid) : à ce moment le carnet a du sens, et
// l'alerte « c'est TA config gagnante » devient concrète.
//
// Honnêteté de tier (sprint 48, WS C) : le cron ne notifie QUE Local / Itinérant
// (gate en service_role dans app/api/crons/personal-window/route.ts). Un gratuit
// (Découverte) qui « activerait » les alertes ne recevrait JAMAIS rien : l'UI lui
// montre donc un upsell, pas un faux « Alertes activées ».
//
// Opt-in STRICT : la permission n'est demandée que sur le clic du bouton (subscribe()
// du hook déclenche requestPermission sur ce geste). Jamais au mount.
//
// Dégradation propre (pas de bouton mort) :
// - tier gratuit         → CTA upsell « passe en Local », pas de bouton d'activation.
// - 'unsupported'        → message discret.
// - 'unavailable'        → clé VAPID absente : « indisponible pour l'instant ».
// - 'ios-needs-pwa'      → astuce « installe l'app sur ton écran d'accueil ».
// - permission 'denied'  → on explique comment réactiver, sans re-proposer en boucle.
// - granted + abonné     → état « Alertes activées ».
//
// Daltonisme : aucun état n'est porté par la seule couleur (icône + libellé texte).
// Tap target ≥ 44px sur le bouton d'action.
export function EnablePushAlerts({
  tier,
  className = '',
}: {
  tier: UserTier
  className?: string
}) {
  const { support, permission, isSubscribed, busy, subscribe } = usePushSubscription()

  const isPaid = tier === 'local' || tier === 'itinerant'

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <section
      aria-label="Alertes de pêche"
      className={`rounded-[14px] border border-sand-200 bg-white p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-600">
          <Bell size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </section>
  )

  const heading = (
    <p className="text-[14.5px] font-semibold text-navy-900">
      Sois prévenu de ta fenêtre du jour
    </p>
  )
  const blurb = (
    <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
      Quand le créneau favorable colle à tes habitudes de prises, on te le dit. Réservé
      aux abonnés Local et Itinérant.
    </p>
  )

  // Tier gratuit (Découverte / anonyme) : le cron ne notifiera jamais ce compte, donc
  // pas de bouton « Activer » (qui mentirait). On vend la proactivité via un upsell.
  if (!isPaid) {
    return (
      <Shell>
        {heading}
        {blurb}
        <Link
          href="/tarifs"
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-[13.5px] font-semibold text-navy-900 transition-colors hover:bg-gold-500/15"
        >
          <Lock size={16} className="text-gold-600" aria-hidden="true" />
          Passe en Local pour être prévenu au bon moment
        </Link>
      </Shell>
    )
  }

  // À partir d'ici : compte Local / Itinérant. On affiche l'état réel de l'abonnement.

  // Clé VAPID absente (dev/preview, ou prod mal configurée) : l'abonnement ne peut
  // pas aboutir. On le dit plutôt que d'afficher un bouton qui ne ferait rien.
  if (support === 'unavailable') {
    return (
      <Shell>
        {heading}
        <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
          Les alertes push sont indisponibles pour l&rsquo;instant. Tu retrouves
          toujours tes créneaux dans tes notifications et sur la carte.
        </p>
      </Shell>
    )
  }

  // iOS Safari hors PWA : push impossible tant que l'app n'est pas installée.
  if (support === 'ios-needs-pwa') {
    return (
      <Shell>
        {heading}
        {blurb}
        <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-sand-100 px-3 py-2 text-[12.5px] leading-relaxed text-ink-600">
          <Smartphone size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Sur iPhone, installe d&rsquo;abord l&rsquo;app sur ton écran d&rsquo;accueil
            (bouton Partager puis « Sur l&rsquo;écran d&rsquo;accueil »), puis reviens
            activer les alertes.
          </span>
        </p>
      </Shell>
    )
  }

  // Navigateur sans support (anciens navigateurs) : message discret, pas de bouton.
  if (support === 'unsupported') {
    return (
      <Shell>
        {heading}
        <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
          Ton navigateur ne gère pas les alertes push. Tu retrouves toujours tes
          créneaux dans tes notifications et sur la carte.
        </p>
      </Shell>
    )
  }

  // Déjà abonné : état confirmé, pas de bouton d'action (le réglage OFF vit dans
  // la page Notifications, cf PushSettingsToggle).
  if (isSubscribed) {
    return (
      <Shell>
        {heading}
        <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-teal-700">
          <BellRing size={15} aria-hidden="true" />
          Alertes activées. On te prévient au bon moment.
        </p>
      </Shell>
    )
  }

  // Permission refusée : on n'insiste pas, on explique le retour arrière.
  if (permission === 'denied') {
    return (
      <Shell>
        {heading}
        <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
          Tu as bloqué les notifications pour ce site. Pour les réactiver, autorise les
          notifications dans les réglages de ton navigateur, puis reviens ici.
        </p>
      </Shell>
    )
  }

  // Cas nominal : bouton d'opt-in (geste requis). subscribe() demande la permission.
  return (
    <Shell>
      {heading}
      {blurb}
      <button
        type="button"
        disabled={busy}
        onClick={() => void subscribe()}
        className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-[13.5px] font-semibold text-navy-950 transition-colors hover:bg-teal-300 disabled:opacity-50"
      >
        <Bell size={16} aria-hidden="true" />
        {busy ? 'Activation…' : 'Activer les alertes'}
      </button>
    </Shell>
  )
}
