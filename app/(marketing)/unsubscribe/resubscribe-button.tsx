'use client'

import { useState, useTransition } from 'react'
import { resubscribeSelf } from './actions'

// Réactivation des emails de relance pour l'utilisateur connecté (1 clic).
export function ResubscribeButton() {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <p className="text-sm text-teal-700 font-medium">
        C&rsquo;est réactivé. Tu recevras de nouveau nos emails de relance.
      </p>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await resubscribeSelf()
          if (res.ok) setDone(true)
        })
      }
      className="inline-block px-6 py-3 rounded-[12px] bg-white border border-ink-200 text-navy-900 hover:bg-sand-50 font-semibold text-sm transition-colors duration-200 disabled:opacity-50"
    >
      {pending ? 'Réactivation…' : 'Réactiver les emails de relance'}
    </button>
  )
}
