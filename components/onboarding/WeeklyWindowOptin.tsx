'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { setWeeklyWindowOptin } from '@/app/actions/weekly-window'

/**
 * Checkbox opt-in de l'écran de fin d'onboarding (sprint 74, Bloc 2) :
 * « Reçois ton créneau du week-end par email chaque vendredi. »
 *
 * NON pré-cochée (défaut colonne `profiles.weekly_window_optin = false`,
 * migration 108). Gratuit, tous tiers, distinct des alertes par port payantes
 * (S72). Optimistic UI + rollback silencieux si l'écriture échoue, même
 * pattern que EmailPrefsToggle (app/(app)/compte/abonnement).
 *
 * Toute la ligne est un bouton (pas un <label> + <input> caché) : évite le
 * piège classique où cliquer le texte ne bascule pas un contrôle custom.
 */
export function WeeklyWindowOptin({ initial }: { initial: boolean }) {
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
    <button
      type="button"
      role="checkbox"
      aria-checked={enabled}
      disabled={pending}
      onClick={toggle}
      className="flex w-full items-start gap-3 py-1 text-left disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
          enabled ? 'border-teal-300 bg-teal-300' : 'border-white/25 bg-transparent'
        }`}
      >
        {enabled && <Check size={13} strokeWidth={3} className="text-navy-950" />}
      </span>
      <span className="text-[12.5px] leading-relaxed">
        <span className="font-medium text-white/85">
          Reçois ton créneau du week-end par email chaque vendredi.
        </span>{' '}
        <span className="text-white/40">Désinscription en un clic depuis chaque email.</span>
      </span>
    </button>
  )
}
