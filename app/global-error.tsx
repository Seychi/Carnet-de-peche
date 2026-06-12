'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Filet de sécurité ultime : erreur de rendu dans le layout racine lui-même.
// Doit rendre <html>/<body> (le layout est cassé à ce stade) — styles inline,
// pas de Tailwind (le CSS peut ne pas être chargé).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#04141C',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Le fil a cassé.</h1>
        <p style={{ color: 'rgba(255,255,255,.6)', maxWidth: 380, lineHeight: 1.5, margin: 0 }}>
          Une erreur inattendue s&apos;est produite. On est prévenus — réessaie dans un instant.
        </p>
        {error.digest && (
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
            Réf. : {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            background: '#14B8A6',
            color: '#04141C',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Recharger
        </button>
      </body>
    </html>
  )
}
