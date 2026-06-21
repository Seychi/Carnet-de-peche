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
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        armed && 'transition-all duration-700 ease-out will-change-[opacity,transform]',
        armed && (shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'),
        className,
      )}
      style={armed && shown && delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
