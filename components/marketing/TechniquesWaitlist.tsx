'use client'

import { useState } from 'react'
import { Loader2, Check, Mail } from 'lucide-react'
import { joinGuideWaitlist } from '@/app/actions/waitlist'

/**
 * Capture email « préviens-moi à la sortie des guides » (/techniques, F8 sprint 31).
 * Rend la meta « inscris-toi pour être notifié » VRAIE (avant : aucune capture).
 * Consentement explicite + minimisation (email seul) + lien confidentialité (RGPD).
 */
export function TechniquesWaitlist() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setError(null)
    const res = await joinGuideWaitlist(email)
    if (!res.ok) {
      setError(res.error)
      setStatus('idle')
      return
    }
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div
        role="status"
        className="mx-auto flex max-w-md items-center justify-center gap-2.5 rounded-[14px] border border-teal-500/30 bg-teal-500/10 px-5 py-4 text-[14px] font-medium text-teal-800"
      >
        <Check size={18} className="shrink-0 text-teal-600" aria-hidden="true" />
        C&apos;est noté ! On te préviendra dès que les guides seront en ligne.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md text-left">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Ton email
        </label>
        <div className="relative flex-1">
          <Mail
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            id="waitlist-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.fr"
            required
            aria-invalid={!!error}
            className="min-h-12 w-full rounded-[12px] border border-sand-200 bg-white pl-9 pr-3 text-[15px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-navy-900 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          {status === 'loading' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Préviens-moi
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[13px] text-coral-500" role="alert">
          {error}
        </p>
      )}

      <p className="mt-2.5 text-[12px] leading-relaxed text-ink-400">
        Un seul email, à la sortie des guides — pas de spam, désinscription sur simple
        demande. Voir notre{' '}
        <a
          href="/legal/confidentialite"
          className="underline underline-offset-2 hover:text-ink-600"
        >
          politique de confidentialité
        </a>
        .
      </p>
    </form>
  )
}
