'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Fish } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// Boundary d'erreur du groupe (app) — rendue DANS le <main> du shell, donc
// header + sidebar + tab bar restent visibles (pas de perte de nav). Pas de
// min-h-screen (le shell fournit déjà la hauteur). Sprint 54 WS-B.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app group error]', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <Fish size={56} className="mb-5 text-teal-500" strokeWidth={1.7} aria-hidden="true" />
      <h1 className="font-display text-2xl text-navy-900">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-ink-500">
        Impossible de charger cette page. Réessaie, ou reviens dans un instant.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-ink-400">Réf. : {error.digest}</p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-[12px] bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-navy-800"
        >
          Réessayer
        </button>
        <Link
          href="/home"
          className="rounded-[12px] border border-ink-200 px-6 py-3 text-sm font-semibold text-navy-900 transition-colors duration-200 hover:bg-ink-100"
        >
          Retour à l&rsquo;accueil
        </Link>
      </div>
    </div>
  )
}
