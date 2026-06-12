'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { X, Share } from 'lucide-react'

const SESSION_COUNT_KEY = 'cdp-session-count'
const INSTALL_DISMISS_KEY = 'cdp-install-dismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA (sprint 11 Bloc A) :
 * 1. Enregistre le service worker (/sw.js).
 * 2. Nouvelle version détectée → toast « Mettre à jour » (le SW attend le
 *    SKIP_WAITING : pas de version fantôme, cf risques du brief).
 * 3. Install prompt discret : bannière dismissable à partir de la 2e session,
 *    jamais de modal bloquante.
 */
export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  // ── Service worker + cycle de mise à jour ─────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return

    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const promptUpdate = (worker: ServiceWorker) => {
        toast('Une nouvelle version est disponible.', {
          duration: Infinity,
          action: {
            label: 'Mettre à jour',
            onClick: () => worker.postMessage('SKIP_WAITING'),
          },
        })
      }
      // Un SW attend déjà (onglet resté ouvert pendant un déploiement).
      if (registration.waiting) promptUpdate(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            promptUpdate(worker)
          }
        })
      })
    })
  }, [])

  // ── Install prompt (2e session, dismissable) ──────────────────────────────
  useEffect(() => {
    const sessions = parseInt(sessionStorage.getItem(SESSION_COUNT_KEY) ?? '', 10)
    if (Number.isNaN(sessions)) {
      const total = parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? '0', 10) + 1
      localStorage.setItem(SESSION_COUNT_KEY, String(total))
      sessionStorage.setItem(SESSION_COUNT_KEY, String(total))
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      const total = parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? '0', 10)
      const dismissed = localStorage.getItem(INSTALL_DISMISS_KEY)
      if (total >= 2 && !dismissed) {
        setInstallEvent(e as BeforeInstallPromptEvent)
        setShowBanner(true) // eslint-disable-line react-hooks/set-state-in-effect -- event handler, pas le corps de l'effet
      }
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!showBanner || !installEvent) return null

  return (
    <div
      role="complementary"
      aria-label="Installer l'application"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-[14px] border border-white/10 bg-navy-950 p-3.5 text-white shadow-lg desk:bottom-5"
    >
      <Share size={18} className="shrink-0 text-teal-300" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        <strong>Installe Carnet de Pêche</strong> — l&apos;icône sur ton écran d&apos;accueil, les
        marées à un tap.
      </p>
      <button
        type="button"
        onClick={async () => {
          setShowBanner(false)
          await installEvent.prompt()
          localStorage.setItem(INSTALL_DISMISS_KEY, '1')
        }}
        className="shrink-0 rounded-lg bg-teal-500 px-3.5 py-2 text-[13px] font-semibold text-navy-950 transition-colors hover:bg-teal-300"
      >
        Installer
      </button>
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => {
          setShowBanner(false)
          localStorage.setItem(INSTALL_DISMISS_KEY, '1')
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  )
}
