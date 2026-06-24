'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { setMarketingOptin } from './actions'

// Toggle des emails de relance/conseils (marketing). Honnête : opt-out en 1 clic.
// Daltonisme : l'état n'est JAMAIS encodé par la seule couleur — on double
// systématiquement par un libellé texte (« Activés » / « Désactivés ») + une icône
// (✓ / ✗) + la position du curseur.
export function EmailPrefsToggle({ initial }: { initial: boolean }) {
  const [optin, setOptin] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !optin
    setOptin(next) // optimiste
    startTransition(async () => {
      const res = await setMarketingOptin(next)
      if (!res.ok) setOptin(!next) // rollback si échec
    })
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-navy-900">Emails de relance et conseils</p>
        <p className="mt-1 text-xs text-ink-500 leading-relaxed">
          Astuces, retours d&rsquo;essai et nouveautés. Les emails liés à ton compte (essai,
          paiement) arrivent toujours.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={optin}
        aria-label="Emails de relance et conseils"
        disabled={pending}
        onClick={toggle}
        className={`shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border text-xs font-semibold transition-colors duration-150 disabled:opacity-50 ${
          optin
            ? 'bg-teal-500 border-teal-500 text-navy-950'
            : 'bg-white border-ink-200 text-ink-600'
        }`}
      >
        {optin ? (
          <>
            <Check size={14} strokeWidth={2.4} aria-hidden="true" />
            Activés
          </>
        ) : (
          <>
            <X size={14} strokeWidth={2.4} aria-hidden="true" />
            Désactivés
          </>
        )}
      </button>
    </div>
  )
}
