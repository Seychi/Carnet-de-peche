'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Fish } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function CarnetError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[carnet error]', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center px-6 text-center">
      <Fish size={64} className="mb-6 text-teal-500" strokeWidth={1.7} aria-hidden="true" />
      <h1 className="font-display text-navy-900 text-4xl mb-3">
        Le fil a cassé
      </h1>
      <p className="text-ink-500 max-w-sm text-lg mb-2">
        Impossible de charger ton carnet. Réessaie ou reviens à la liste.
      </p>
      {error.digest && (
        <p className="text-xs text-ink-400 font-mono mb-8">
          Réf. : {error.digest}
        </p>
      )}
      {!error.digest && <div className="mb-8" />}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-8 py-3.5 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-[12px] transition-colors duration-200"
        >
          Recharger
        </button>
        <Link
          href="/carnet"
          className="px-8 py-3.5 border border-ink-200 hover:bg-ink-100 text-navy-900 font-semibold rounded-[12px] transition-colors duration-200"
        >
          Retour au carnet
        </Link>
      </div>
    </div>
  )
}
