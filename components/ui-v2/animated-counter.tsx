'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Compteur « count-up » au défilement. Robuste SEO / no-JS / reduced-motion :
 *  - SSR rend la valeur RÉELLE (pas de 0 figé) → correcte sans JS et indexable.
 *  - `prefers-reduced-motion: reduce` → valeur affichée d'emblée, aucune anim.
 *  - Sinon : démarre à 0 et compte jusqu'à `value` (au montage si déjà visible,
 *    sinon quand l'élément entre dans le viewport).
 */
export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  durationMs = 1200,
  className,
}: {
  value: number
  suffix?: string
  prefix?: string
  durationMs?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const run = () => {
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(Math.round(eased * value))
        if (t < 1) raf = requestAnimationFrame(step)
      }
      setDisplay(0)
      raf = requestAnimationFrame(step)
    }

    if (el.getBoundingClientRect().top < window.innerHeight) {
      run()
      return () => cancelAnimationFrame(raf)
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run()
          obs.disconnect()
        }
      },
      // Déclenche 80 px avant le bord bas (plus tôt qu'avant, threshold réduit).
      { threshold: 0.1, rootMargin: '0px 0px 80px 0px' },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, durationMs])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString('fr-FR')}
      {suffix}
    </span>
  )
}
