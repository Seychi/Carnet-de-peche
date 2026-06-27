'use client'

import { useCallback, useEffect, useState } from 'react'

// Hook partagé d'abonnement Web Push (sprint 39, WS B). Importé par l'opt-in UX
// (EnablePushAlerts) ET par la page réglages notif (WS C) — le contrat exporté
// ci-dessous est stable, ne pas le casser.
//
// Garde-fous :
// - `subscribe()` demande la permission + s'abonne UNIQUEMENT sur geste utilisateur
//   (appelé depuis un onClick). Jamais au mount.
// - `userVisibleOnly: true` obligatoire (Chrome refuse sinon).
// - Dégradation propre : navigateur non supporté → `support = 'unsupported'` ;
//   iOS Safari hors PWA → `support = 'ios-needs-pwa'` (pas de bouton mort).

export type PushSupport = 'supported' | 'unsupported' | 'ios-needs-pwa'

export type UsePushSubscription = {
  support: PushSupport
  /** null avant hydratation (SSR-safe : pas de lecture window au render serveur). */
  permission: NotificationPermission | null
  isSubscribed: boolean
  busy: boolean
  /** Demande la permission + pushManager.subscribe + POST /api/push/subscribe. */
  subscribe: () => Promise<void>
  /** getSubscription().unsubscribe() + POST /api/push/unsubscribe. */
  unsubscribe: () => Promise<void>
}

// base64url (clé publique VAPID) → Uint8Array pour applicationServerKey.
// Util classique (MDN / web.dev) : pad, remplace -/_ par +//, atob, charCodeAt.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function detectSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'

  const hasApis =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  // iOS (iPhone/iPad, y compris iPadOS déguisé en Mac) : Web Push ne marche qu'en
  // PWA installée (iOS 16.4+). Hors standalone → on invite à installer plutôt que
  // d'afficher un bouton mort.
  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true

  if (isIOS && !isStandalone) return 'ios-needs-pwa'
  if (!hasApis) return 'unsupported'
  return 'supported'
}

export function usePushSubscription(): UsePushSubscription {
  const [support, setSupport] = useState<PushSupport>('unsupported')
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  // Hydratation : détecte le support + l'état réel de l'abonnement côté client.
  useEffect(() => {
    let cancelled = false
    const detected = detectSupport()
    setSupport(detected)

    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    if (detected !== 'supported' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setIsSubscribed(!!sub)
      })
      .catch(() => {
        // SW non enregistré (ex. dev, où le SW est prod-only) : on reste non abonné.
        if (!cancelled) setIsSubscribed(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (support !== 'supported' || busy) return
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      // Clés VAPID absentes (dev/preview) : on ne tente rien plutôt que de planter.
      console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY absente, abonnement ignoré.')
      return
    }

    setBusy(true)
    try {
      // Geste utilisateur requis : requestPermission() est appelé depuis ce handler.
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // urlBase64ToUint8Array renvoie Uint8Array<ArrayBufferLike> ; applicationServerKey
          // attend BufferSource → cast explicite (clé publique VAPID, sûr).
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        }))

      const json = sub.toJSON() as {
        endpoint?: string
        keys?: { p256dh?: string; auth?: string }
      }
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Abonnement incomplet')
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      })
      if (!res.ok) {
        // L'enregistrement serveur a échoué : on annule l'abonnement local pour ne
        // pas laisser un device abonné côté navigateur mais inconnu du serveur.
        await sub.unsubscribe().catch(() => {})
        throw new Error('Enregistrement serveur échoué')
      }

      setIsSubscribed(true)
    } catch (err) {
      console.error('[push] abonnement échec :', err)
      setIsSubscribed(false)
    } finally {
      setBusy(false)
    }
  }, [support, busy])

  const unsubscribe = useCallback(async () => {
    if (busy || !('serviceWorker' in navigator)) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const endpoint = sub?.endpoint
      if (sub) await sub.unsubscribe().catch(() => {})

      if (endpoint) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {})
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('[push] désabonnement échec :', err)
    } finally {
      setBusy(false)
    }
  }, [busy])

  return { support, permission, isSubscribed, busy, subscribe, unsubscribe }
}
