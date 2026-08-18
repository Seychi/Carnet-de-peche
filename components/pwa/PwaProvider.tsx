'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { X, Share } from 'lucide-react'
import { safeGet, safeSet } from '@/lib/storage/safe'

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

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Certains navigateurs in-app résolvent la promesse avec `undefined` — aucune
        // spec ne garantit le contraire. C'est l'issue JAVASCRIPT-NEXTJS-Y :
        // « Cannot read properties of undefined (reading 'waiting') ».
        if (!registration) return

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
      .catch(() => {
        // ★ Silence VOLONTAIRE, et c'est la bonne décision produit.
        //
        // Sans ce `.catch()`, toute rejection devenait une unhandled rejection
        // remontée à Sentry : 6 issues pour 12 événements, dont AUCUNE n'est un bug
        // de notre code et dont aucune n'est réparable depuis ici.
        //   V, 15 → navigateur in-app (le shim `wrsParams.serviceWorkers` est visible
        //            dans la stack)
        //   13    → l'utilisateur a refusé l'autorisation. Comportement NORMAL.
        //   1H    → un proxy ou un antivirus casse la chaîne TLS
        //   K     → réseau coupé pendant l'enregistrement
        //   1A    → stockage interdit (Safari, mode strict)
        //
        // Sans service worker, le site fonctionne : on perd le hors-ligne et le toast
        // de mise à jour, rien d'autre. On dégrade, et on ne prévient PAS l'utilisateur
        // (aucun toast, aucune bannière) : il n'a rien demandé et rien à corriger.
      })
  }, [])

  // ── Install prompt (2e session, dismissable) ──────────────────────────────
  useEffect(() => {
    // ★ L'ORDRE compte, et ce n'est pas cosmétique.
    //
    // Avant le sprint 88, le comptage de session venait en premier et lisait
    // `sessionStorage` nu. Chez un utilisateur dont le navigateur refuse le stockage,
    // la lecture levait (issue JAVASCRIPT-NEXTJS-14), l'effet s'arrêtait là, et le
    // `addEventListener` ci-dessous n'était JAMAIS posé : la bannière d'installation
    // ne pouvait plus s'afficher. Pas un log, une fonctionnalité morte en silence.
    //
    // Le listener est donc posé d'abord. Même avec `safeGet`, dépendre du stockage
    // pour atteindre un `addEventListener` reste une architecture fragile.
    const onPrompt = (e: Event) => {
      e.preventDefault()
      const total = parseInt(safeGet('local', SESSION_COUNT_KEY) ?? '0', 10)
      const dismissed = safeGet('local', INSTALL_DISMISS_KEY)
      if (total >= 2 && !dismissed) {
        setInstallEvent(e as BeforeInstallPromptEvent)
        setShowBanner(true)
      }
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // Comptage de session, best-effort. Si le stockage est refusé, `safeGet` rend
    // null, le compteur reste à 0 et la bannière ne s'affiche pas.
    // ⚠️ C'est ASSUMÉ et ce n'est pas réparable : savoir qu'on en est à la 2e session
    // exige, par définition, de se souvenir de la 1re. La seule alternative serait de
    // proposer l'installation dès la 1re visite et de ne jamais pouvoir mémoriser le
    // refus — donc une bannière que l'utilisateur ne peut pas faire taire. Non.
    // Ce que le sprint 88 corrige ici, c'est l'EXCEPTION, pas l'impossibilité.
    const sessions = parseInt(safeGet('session', SESSION_COUNT_KEY) ?? '', 10)
    if (Number.isNaN(sessions)) {
      const total = parseInt(safeGet('local', SESSION_COUNT_KEY) ?? '0', 10) + 1
      // ★ On n'incremente le total QUE si on a su marquer la session en cours.
      // Sinon, avec un `sessionStorage` refuse mais un `localStorage` qui marche,
      // le marqueur de session ne tiendrait jamais : chaque page vue relancerait
      // l'increment et le « compteur de sessions » deviendrait un compteur de
      // pages vues, avec une banniere proposee des la 2e page de la 1re visite.
      if (safeSet('session', SESSION_COUNT_KEY, String(total))) {
        safeSet('local', SESSION_COUNT_KEY, String(total))
      }
    }

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
        <strong>Installe Carnet de Pêche</strong> : l&apos;icône sur ton écran d&apos;accueil, les
        marées à un tap.
      </p>
      <button
        type="button"
        onClick={async () => {
          setShowBanner(false)
          // Le choix est mémorisé AVANT l'appel : `prompt()` n'est consommable qu'une
          // seule fois et certains navigateurs périment l'événement. S'il rejetait, on
          // ressortirait la bannière à chaque visite alors que l'utilisateur a répondu.
          safeSet('local', INSTALL_DISMISS_KEY, '1')
          try {
            await installEvent.prompt()
          } catch {
            // Événement déjà consommé ou périmé. Rien à réparer, rien à dire, et
            // surtout pas une unhandled rejection de plus dans Sentry.
          }
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
          safeSet('local', INSTALL_DISMISS_KEY, '1')
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  )
}
