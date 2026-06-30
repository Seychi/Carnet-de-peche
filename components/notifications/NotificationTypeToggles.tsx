'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Check, X, Lock } from 'lucide-react'
import { setNotificationPref } from '@/app/actions/notification-prefs'
import {
  NOTIFICATION_PREF_META,
  type NotificationPrefKey,
  type NotificationPrefMeta,
} from '@/lib/notifications/prefs-meta'
import type { UserTier } from '@/lib/auth/tier'

// Réglages par type de push (sprint 49 WS C). Un toggle par type de notification
// (fenêtre optimale, grandes marées, prise d'un pêcheur suivi, fermeture d'espèce,
// récap hebdo). Chaque toggle appelle setNotificationPref(type, enabled).
//
// L'état initial vient du serveur (notification_prefs du profil), passé en prop.
// Le toggle push GLOBAL (PushSettingsToggle) reste le maître interrupteur : ces
// réglages-ci affinent QUELS types arrivent, mais si le push global est coupé,
// rien n'est envoyé. C'est expliqué en micro-copy sur la page.
//
// Honnêteté de tier (sprint 51 WS-E) : la « fenêtre optimale » (optimal_window)
// n'est notifiée qu'aux abonnés Local/Itinérant (cron gaté en service_role). Pour
// un gratuit, on n'affiche donc PAS un toggle « Activé » qui ne déclencherait jamais
// rien : on montre un renvoi vers /tarifs. Les 5 autres types partent pour tous.
//
// Daltonisme (John daltonien) : l'état n'est JAMAIS encodé par la seule couleur,
// on double par un libellé texte (« Activé » / « Désactivé ») + une icône (✓ / ✗)
// + la position du curseur. Aligné sur EmailPrefsToggle / PushSettingsToggle.

function TypeToggle({
  meta,
  initial,
}: {
  meta: { key: NotificationPrefKey; label: string; description: string }
  initial: boolean
}) {
  const [enabled, setEnabled] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next) // optimiste
    startTransition(async () => {
      const res = await setNotificationPref(meta.key, next)
      if (!res.ok) setEnabled(!next) // rollback si échec
    })
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-navy-900">{meta.label}</p>
        <p className="mt-1 text-xs text-ink-500 leading-relaxed">{meta.description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={meta.label}
        disabled={pending}
        onClick={toggle}
        className={`shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border text-xs font-semibold transition-colors duration-150 disabled:opacity-50 ${
          enabled
            ? 'bg-teal-500 border-teal-500 text-navy-950'
            : 'bg-white border-ink-200 text-ink-600'
        }`}
      >
        {enabled ? (
          <>
            <Check size={14} strokeWidth={2.4} aria-hidden="true" />
            Activé
          </>
        ) : (
          <>
            <X size={14} strokeWidth={2.4} aria-hidden="true" />
            Désactivé
          </>
        )}
      </button>
    </div>
  )
}

// Type payant non disponible pour ce compte : on n'affiche pas un faux toggle
// « Activé », on explique que c'est réservé aux abonnés et on renvoie au tarif.
// (Daltonisme : icône Lock + libellé texte, jamais la seule couleur.)
function LockedToggle({ meta }: { meta: NotificationPrefMeta }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-navy-900">{meta.label}</p>
        <p className="mt-1 text-xs text-ink-500 leading-relaxed">{meta.description}</p>
      </div>
      <Link
        href="/tarifs"
        aria-label={`${meta.label} : réservé aux abonnés, voir les tarifs`}
        className="shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border border-gold-500/40 bg-gold-500/10 text-xs font-semibold text-navy-900 transition-colors hover:bg-gold-500/15"
      >
        <Lock size={14} strokeWidth={2.2} aria-hidden="true" />
        Réservé aux abonnés
      </Link>
    </div>
  )
}

export function NotificationTypeToggles({
  prefs,
  tier,
}: {
  /** notification_prefs du profil (objet jsonb). Absent/{} = tout activé. */
  prefs: Record<string, unknown>
  /** Tier courant : la « fenêtre optimale » est réservée à Local/Itinérant. */
  tier: UserTier
}) {
  const isPaid = tier === 'local' || tier === 'itinerant'
  return (
    <div className="space-y-4">
      {NOTIFICATION_PREF_META.map((meta) => {
        // Fenêtre optimale chez un gratuit : pas de faux « Activé », on renvoie au tarif.
        if (meta.key === 'optimal_window' && !isPaid) {
          return <LockedToggle key={meta.key} meta={meta} />
        }
        // Règle partagée : activé sauf si la clé vaut explicitement "false".
        const raw = prefs[meta.key]
        const enabled = raw !== false && raw !== 'false'
        return <TypeToggle key={meta.key} meta={meta} initial={enabled} />
      })}
    </div>
  )
}
