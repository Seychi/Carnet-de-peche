'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { setNotificationPref } from '@/app/actions/notification-prefs'
import {
  NOTIFICATION_PREF_META,
  type NotificationPrefKey,
} from '@/lib/notifications/prefs-meta'

// Réglages par type de push (sprint 49 WS C). Un toggle par type de notification
// (fenêtre optimale, grandes marées, prise d'un pêcheur suivi, fermeture d'espèce,
// récap hebdo). Chaque toggle appelle setNotificationPref(type, enabled).
//
// L'état initial vient du serveur (notification_prefs du profil), passé en prop.
// Le toggle push GLOBAL (PushSettingsToggle) reste le maître interrupteur : ces
// réglages-ci affinent QUELS types arrivent, mais si le push global est coupé,
// rien n'est envoyé. C'est expliqué en micro-copy sur la page.
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

export function NotificationTypeToggles({
  prefs,
}: {
  /** notification_prefs du profil (objet jsonb). Absent/{} = tout activé. */
  prefs: Record<string, unknown>
}) {
  return (
    <div className="space-y-4">
      {NOTIFICATION_PREF_META.map((meta) => {
        // Règle partagée : activé sauf si la clé vaut explicitement "false".
        const raw = prefs[meta.key]
        const enabled = raw !== false && raw !== 'false'
        return <TypeToggle key={meta.key} meta={meta} initial={enabled} />
      })}
    </div>
  )
}
