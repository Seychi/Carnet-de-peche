import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Toute erreur non interceptée des Server Components / Actions / routes
// remonte avec sa stack — couvre l'alerte « toute 5xx » du brief.
export const onRequestError = Sentry.captureRequestError
