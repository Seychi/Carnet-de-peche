// Stub analytics — brancher PostHog au sprint 4
// Pattern d'usage : analytics.catchLogStarted({ source: 'web' })
// Quand PostHog est installé, remplacer `capture` par posthog.capture et supprimer le stub.

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}

function capture(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  window.posthog?.capture(event, props)
}

export const analytics = {
  catchLogStarted(props: { source: 'web' | 'mobile' }): void {
    capture('catch_log_started', props)
  },
  catchLogCompleted(props: { species: string; technique: string; hasPhoto: boolean }): void {
    capture('catch_log_completed', props)
  },
  catchLogAbandoned(props: { lastFieldFocused: string }): void {
    capture('catch_log_abandoned', props)
  },
}
