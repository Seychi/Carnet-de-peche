'use client'

import Lenis from 'lenis'
import { gsap, ScrollTrigger, useGSAP } from './gsap'

/**
 * Smooth scroll (Lenis) synchronisé avec ScrollTrigger — colonne vertébrale du
 * ressenti premium (sprint 34, WS-1). À monter UNE fois sur la home.
 *
 * - Piloté par le ticker GSAP (`autoRaf: false`) pour éviter le double-RAF.
 * - `prefers-reduced-motion` OU pointeur tactile → AUCUNE init Lenis : on garde
 *   le scroll natif (ScrollTrigger fonctionne très bien dessus, et le smooth-scroll
 *   tactile est instable). Le hero live mobile (décision John) ne dépend pas de Lenis.
 * - Cleanup automatique au démontage via `useGSAP` (+ `lenis.destroy()`).
 */
export function SmoothScroll() {
  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    if (reduce || isTouch) return

    const lenis = new Lenis({ autoRaf: false })
    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => lenis.raf(time * 1000) // ticker en s → Lenis en ms
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  return null
}
