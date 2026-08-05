'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { setWeeklyWindowOptin } from '@/app/actions/weekly-window'

// Toggle « email hebdo » de la page /notifications (sprint 74, Bloc 2).
// Même colonne (`profiles.weekly_window_optin`) et même server action que le
// checkbox de l'écran de fin d'onboarding : celui-ci permet de l'activer ou de
// le couper APRÈS coup. Distinct des alertes par port (payantes, panneau
// AlertSettingsPanel plus bas sur cette page) : ce toggle-ci est gratuit,
// ouvert à tous les tiers.
//
// Pattern de câblage repris de EmailPrefsToggle (compte/abonnement) et
// TypeToggle (NotificationTypeToggles) : pilule ON/OFF avec libellé texte
// (« Activé »/« Désactivé ») + icône, jamais la seule couleur (John daltonien).
export function WeeklyEmailToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next) // optimiste
    startTransition(async () => {
      const res = await setWeeklyWindowOptin(next)
      if (!res.ok) setEnabled(!next) // rollback si échec
    })
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-navy-900">Ton créneau du week-end</p>
        <p className="mt-1 text-xs text-ink-500 leading-relaxed">
          Un email chaque vendredi avec le meilleur créneau du week-end dans ton secteur.
          Désinscription en un clic depuis l&rsquo;email.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Ton créneau du week-end par email"
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
