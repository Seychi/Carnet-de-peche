'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Révèle son contenu (fade + léger slide-up) quand il entre dans le viewport.
 * Progressive enhancement, robuste SEO / no-JS / reduced-motion :
 *  - SSR rend le contenu VISIBLE (aucune opacité 0 dans le HTML) → indexable et
 *    affiché même sans JS.
 *  - Au montage : si `prefers-reduced-motion: reduce` → on ne touche à rien.
 *    Si l'élément est déjà dans le viewport → on le laisse visible (pas de flash).
 *    Sinon (hors écran) → on l'« arme » (état caché) puis on le révèle au scroll.
 * Animations en opacity/transform uniquement (pas de layout thrash).
 */
export function ScrollReveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode
  className?: string
  delayMs?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Déjà visible au montage → on garde tel quel (pas de flash sur le pli).
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return

    setArmed(true)
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          obs.disconnect()
        }
      },
      // Déclenche ~120 px AVANT que l'élément atteigne le bord bas du viewport
      // (rootMargin positif = étend la zone de détection vers le bas).
      // threshold: 0 = déclenche dès le 1er pixel visible.
      // Ceci élimine le flash blanc/crème dû au déclenchement tardif.
      { threshold: 0, rootMargin: '0px 0px 120px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        // duration-300 (was duration-700) : même un reveal légèrement tardif
        // ne laisse pas de bande crème visible.
        armed && 'transition-all duration-300 ease-out will-change-[opacity,transform]',
        armed && (shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'),
        className,
      )}
      style={armed && shown && delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
