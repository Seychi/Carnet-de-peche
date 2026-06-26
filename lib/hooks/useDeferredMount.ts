'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

type Options = { timeout?: number }

/**
 * Retourne `true` une fois qu'il est « sûr » de monter un composant client LOURD
 * (ex. MapLibre) : au plus tôt entre (a) le navigateur idle après le 1er paint
 * (`requestIdleCallback`), (b) le 1er geste utilisateur sur le conteneur. But : sortir
 * la long task d'init de la fenêtre de chargement → gain TBT (sprint 36 « Carte instantanée »).
 *
 * SSR-safe. ⚠️ `requestIdleCallback` n'existe PAS sur Safari/iOS (cible mobile !) → fallback
 * `setTimeout(timeout)` obligatoire, sinon la carte ne se monterait jamais sans geste.
 */
export function useDeferredMount(
  containerRef: RefObject<HTMLElement | null>,
  { timeout = 2000 }: Options = {},
): boolean {
  const [shouldMount, setShouldMount] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const el = containerRef.current
    const events = ['pointerdown', 'touchstart', 'wheel', 'scroll'] as const

    const fire = () => {
      if (doneRef.current) return
      doneRef.current = true
      setShouldMount(true)
      if (idleId !== undefined && 'cancelIdleCallback' in window) cancelIdleCallback(idleId)
      if (timeoutId) clearTimeout(timeoutId)
      events.forEach((evt) => el?.removeEventListener(evt, fire))
    }

    // (a) idle après le 1er paint, fallback setTimeout (Safari/iOS) avec timeout borné.
    if ('requestIdleCallback' in window) {
      idleId = requestIdleCallback(fire, { timeout })
    } else {
      timeoutId = setTimeout(fire, timeout)
    }

    // (b) 1er geste utilisateur sur le conteneur (passif → ne bloque pas le scroll).
    events.forEach((evt) => el?.addEventListener(evt, fire, { passive: true, once: true }))

    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in window) cancelIdleCallback(idleId)
      if (timeoutId) clearTimeout(timeoutId)
      events.forEach((evt) => el?.removeEventListener(evt, fire))
    }
  }, [containerRef, timeout])

  return shouldMount
}
