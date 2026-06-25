'use client'

import Lenis from 'lenis'
import { gsap, ScrollTrigger, useGSAP } from './gsap'
import { motionReduced, isCoarsePointer } from './config'

/**
 * Smooth scroll (Lenis) synchronisé avec ScrollTrigger — colonne vertébrale du
 * ressenti premium (sprint 34, WS-1). À monter UNE fois sur la home.
 *
 * - Piloté par le ticker GSAP (`autoRaf: false`) pour éviter le double-RAF.
 * - Bridage reduced-motion via la politique centrale (`config.ts`) : par défaut Lenis
 *   joue. On le garde COUPÉ sur tactile car le smooth-scroll au doigt fait du jank
 *   (il se bat contre l'inertie native) → sur mobile le scroll NATIF est le bon ressenti,
 *   pas une dégradation. Tout le reste du motion (hero, reveals, marquee) joue sur mobile.
 * - Cleanup automatique au démontage via `useGSAP` (+ `lenis.destroy()`).
 */
export function SmoothScroll() {
  useGSAP(() => {
    if (motionReduced() || isCoarsePointer()) return

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
