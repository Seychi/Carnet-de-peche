'use client'

import { useState, useTransition } from 'react'
import { Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { analytics } from '@/lib/analytics'
import { updateRankingVisibility } from './actions'

// Toggle opt-in aux classements (Sprint 66, Bloc 2). Instantané et réversible. L'état n'est
// JAMAIS porté par la seule couleur (John est daltonien) : la POSITION du bouton + un libellé
// texte « Activé / Désactivé » + role="switch"/aria-checked donnent l'état de trois façons.
export function RankingVisibilityToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next) // optimiste
    startTransition(async () => {
      const res = await updateRankingVisibility(next)
      if (res.error) {
        setEnabled(!next) // revert en cas d'échec
        toast.error(res.error)
      } else {
        // Analytics : émis seulement à l'opt-in (publication), pas au retrait.
        if (next) {
          analytics.classementPublished()
        }
        toast.success(
          next
            ? 'Tu apparais désormais dans les classements.'
            : 'Tu es retiré des classements.',
        )
      }
    })
  }

  return (
    <section className="mb-6 rounded-[14px] border border-sand-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-gold-700">
            <Trophy size={18} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-navy-900">
              Apparaître dans les classements
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
              Ton pseudo et tes stats (XP, prises, records) peuvent apparaître dans les
              classements. Le classement départemental affiche ton département de
              rattachement (celui de ton profil), jamais tes lieux de pêche ni une
              coordonnée. Réversible à tout moment.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            role="switch"
            aria-checked={enabled ? 'true' : 'false'}
            aria-label="Apparaître dans les classements"
            onClick={toggle}
            disabled={pending}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60',
              enabled ? 'bg-teal-600' : 'bg-ink-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
          <span
            className={cn(
              'font-mono text-[11px] font-medium uppercase tracking-wide',
              enabled ? 'text-teal-700' : 'text-ink-500',
            )}
          >
            {enabled ? 'Activé' : 'Désactivé'}
          </span>
        </div>
      </div>
    </section>
  )
}
