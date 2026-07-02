'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Gift, Loader2 } from 'lucide-react'
import { CelebrationOverlay } from '@/components/gamification/CelebrationOverlay'
import { redeemFounderCode, type RedeemState } from './actions'

const TIER_LABELS: Record<string, string> = {
  local: 'Local',
  itinerant: 'Itinérant',
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso))
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="min-h-[44px] shrink-0 rounded-[12px] bg-navy-900 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-navy-900/90 disabled:opacity-60"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Vérification…
        </span>
      ) : (
        'Échanger'
      )}
    </button>
  )
}

/**
 * Champ « Échanger un code fondateur » (sprint 68). Au succès : célébration
 * (CelebrationOverlay, sprint 61) PUIS router.refresh() à la fermeture pour
 * re-rendre la page serveur avec l'entitlement actif.
 */
export function RedeemCodeForm() {
  const router = useRouter()
  const [state, formAction] = useActionState<RedeemState, FormData>(
    redeemFounderCode,
    { status: 'idle' }
  )
  const [celebrating, setCelebrating] = useState(false)
  const handled = useRef<RedeemState | null>(null)

  useEffect(() => {
    if (state.status === 'granted' && state !== handled.current) {
      handled.current = state
      setCelebrating(true)
    }
  }, [state])

  const granted = state.status === 'granted' ? state : null
  const expiry = granted ? formatExpiry(granted.expiresAt) : null

  return (
    <>
      <form action={formAction} className="flex flex-col gap-2">
        <label htmlFor="redeem-code" className="text-[13px] font-semibold text-navy-900">
          Ton code
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="redeem-code"
            name="code"
            type="text"
            autoComplete="off"
            placeholder="Ex. FDR-XXXX-XXXX"
            className="min-h-[44px] flex-1 rounded-[12px] border border-ink-200 bg-white px-4 font-mono text-[14px] uppercase text-navy-900 placeholder:font-sans placeholder:normal-case placeholder:text-ink-400 focus:border-navy-900 focus:outline-none"
            required
          />
          <SubmitButton />
        </div>
        {state.status === 'error' && (
          <p className="text-[13px] text-coral-500" role="alert">
            {state.error}
          </p>
        )}
      </form>

      <CelebrationOverlay
        moments={
          granted
            ? [
                {
                  key: 'founder-comp',
                  title: `🎉 Abonnement ${TIER_LABELS[granted.tier] ?? granted.tier} offert, activé !`,
                  subtitle: expiry
                    ? `Actif jusqu'au ${expiry}.`
                    : 'Actif, sans date de fin.',
                  detail: 'Merci de faire partie des fondateurs.',
                  tone: 'badge',
                  icon: Gift,
                },
              ]
            : []
        }
        open={celebrating}
        onClose={() => {
          setCelebrating(false)
          router.refresh()
        }}
      />
    </>
  )
}
