'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl mb-6" aria-hidden="true">🪝</div>
      <h1 className="font-display text-navy-900 text-4xl mb-3">
        Le moulinet s'est cassé
      </h1>
      <p className="text-ink-500 max-w-sm text-lg mb-2">
        Une erreur inattendue s'est produite. Nos équipes ont été notifiées.
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
          Recharger la page
        </button>
        <Link
          href="/"
          className="px-8 py-3.5 border border-ink-200 hover:bg-ink-100 text-navy-900 font-semibold rounded-[12px] transition-colors duration-200"
        >
          Retour à l'accueil
        </Link>
      </div>
      <p className="mt-8 text-sm text-ink-400">
        Si le problème persiste :{' '}
        <a
          href="mailto:contact@carnet-de-peche.com"
          className="underline hover:text-navy-900 transition-colors"
        >
          contact@carnet-de-peche.com
        </a>
      </p>
    </div>
  )
}
