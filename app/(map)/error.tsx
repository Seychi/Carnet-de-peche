'use client'

import { useEffect } from 'react'
import { Fish } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// Boundary d'erreur de la carte — remplit le <main flex-1 min-h-0> du layout (map).
// Pas de min-h-screen (le layout est en h-dvh overflow-hidden → débordement sinon).
// Sprint 54 WS-B.
export default function MapError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[map error]', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center bg-sand-50 px-6 text-center">
      <Fish size={56} className="mb-5 text-teal-500" strokeWidth={1.7} aria-hidden="true" />
      <h1 className="font-display text-2xl text-navy-900">La carte n&rsquo;a pas pu se charger</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">Réessaie, ou reviens dans un instant.</p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-ink-400">Réf. : {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-[12px] bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-navy-800"
      >
        Réessayer
      </button>
    </div>
  )
}
