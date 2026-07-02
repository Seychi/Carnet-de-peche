'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { Copy, Loader2, Ticket } from 'lucide-react'
import type { MintResult } from '@/app/actions/invites'

// ---------------------------------------------------------------------------
// Onglet Invitations (sprint 68) : formulaire de mint (client, useActionState)
// + bouton copier réutilisable pour la liste des codes (rendue côté serveur).
// ---------------------------------------------------------------------------

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copié dans le presse-papiers.')
  } catch {
    toast.error('Impossible de copier. Sélectionne le code à la main.')
  }
}

export function CopyCodeButton({ code, label }: { code: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(code)}
      title={`Copier ${code}`}
      className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-sand-200 bg-white px-3 py-1 text-[11px] font-medium text-ink-600 transition-colors hover:border-ink-300"
    >
      <Copy size={12} aria-hidden="true" />
      {label ?? 'Copier'}
    </button>
  )
}

function MintSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy-900 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-900/90 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Génération…
        </>
      ) : (
        <>
          <Ticket size={14} aria-hidden="true" />
          Générer les codes
        </>
      )}
    </button>
  )
}

const inputCls =
  'min-h-[44px] w-full rounded-[12px] border border-sand-200 bg-white px-3 py-2 text-[13px] text-ink-700 focus:border-navy-900 focus:outline-none'
const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-400'

export function MintCodesForm({
  action,
}: {
  action: (prev: MintResult | null, formData: FormData) => Promise<MintResult>
}) {
  const [state, formAction] = useActionState(action, null)
  const handled = useRef<MintResult | null>(null)

  useEffect(() => {
    if (!state || state === handled.current) return
    handled.current = state
    if (state.ok) toast.success(`${state.codes.length} code(s) généré(s).`)
    else toast.error(state.error)
  }, [state])

  return (
    <div className="rounded-[14px] border border-sand-200 bg-white p-4">
      <p className="mb-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy-900">
        <Ticket size={15} aria-hidden="true" />
        Générer une vague de codes
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="mint-count" className={labelCls}>
              Nombre
            </label>
            <input
              id="mint-count"
              name="count"
              type="number"
              min={1}
              max={200}
              defaultValue={10}
              required
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="mint-max-uses" className={labelCls}>
              Usages / code
            </label>
            <input
              id="mint-max-uses"
              name="maxUses"
              type="number"
              min={1}
              max={10000}
              defaultValue={1}
              required
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="mint-tier" className={labelCls}>
              Tier offert
            </label>
            <select id="mint-tier" name="tier" defaultValue="local" className={inputCls}>
              <option value="local">Local</option>
              <option value="itinerant">Itinérant</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="mint-months" className={labelCls}>
              Durée (mois)
            </label>
            <input
              id="mint-months"
              name="months"
              type="number"
              min={1}
              max={120}
              defaultValue={6}
              placeholder="Vide = sans fin"
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mint-label" className={labelCls}>
            Étiquette (interne, ex. « vague fondateurs juillet »)
          </label>
          <input
            id="mint-label"
            name="label"
            type="text"
            maxLength={80}
            className={inputCls}
          />
        </div>
        <p className="text-[11px] text-ink-400">
          Durée vide = comp sans expiration (révocable à la main). Défaut : 6 mois.
        </p>
        <div>
          <MintSubmit />
        </div>
      </form>

      {state?.ok && state.codes.length > 0 && (
        <div className="mt-4 rounded-[12px] border border-teal-200 bg-teal-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-navy-900">
              Codes générés ({state.codes.length}) : distribue-les, ils n&rsquo;apparaîtront
              plus en clair qu&rsquo;ici et dans la liste ci-dessous.
            </p>
            <CopyCodeButton code={state.codes.join('\n')} label="Tout copier" />
          </div>
          <ul className="flex flex-wrap gap-2">
            {state.codes.map((code) => (
              <li key={code} className="inline-flex items-center gap-1.5">
                <code className="rounded-[8px] bg-white px-2 py-1 font-mono text-[12px] text-navy-900">
                  {code}
                </code>
                <CopyCodeButton code={code} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
