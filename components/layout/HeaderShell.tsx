'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Enveloppe visuelle du header (Client Component).
 *
 * Le <header> sticky a déjà un backdrop-blur statique au repos. Au scroll
 * (scrollY > 10) on RENFORCE l'effet : ombre portée + blur/opacité accrus +
 * bordure plus marquée, pour décoller visuellement le header du contenu.
 *
 * Le fetch user/profile reste côté serveur dans <Header> : le contenu
 * (logo / nav / actions) est passé en `children` et rendu tel quel ici.
 *
 * La transition est gérée en CSS (background/box-shadow/border) et neutralisée
 * sous prefers-reduced-motion via le media query inline ci-dessous — le
 * changement d'état reste instantané mais sans animation pour ces utilisateurs.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // rAF-throttle : on ne re-render que quand l'état franchit le seuil (perf).
    let raf = 0
    let last = window.scrollY > 10
    setScrolled(last)
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const next = window.scrollY > 10
        if (next !== last) {
          last = next
          setScrolled(next)
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <header
      data-scrolled={scrolled ? 'true' : 'false'}
      className="header-shell sticky top-0 z-50"
      style={{
        // Blur FIXE (jamais animé — transitionner backdrop-filter relayout le flou
        // à chaque frame = jank). On n'anime que background/ombre/bordure (GPU).
        backdropFilter: 'saturate(180%) blur(16px)',
        WebkitBackdropFilter: 'saturate(180%) blur(16px)',
        background: scrolled ? 'rgba(251,248,242,.96)' : 'rgba(251,248,242,.92)',
        borderBottom: scrolled
          ? '1px solid rgba(10,47,61,.10)'
          : '1px solid rgba(10,47,61,.07)',
        boxShadow: scrolled ? '0 6px 24px -12px rgba(10,47,61,.22)' : '0 0 0 0 rgba(10,47,61,0)',
        transition: 'background 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
      }}
    >
      {/* prefers-reduced-motion : pas d'animation, l'état change instantanément */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .header-shell { transition: none !important; }
        }
      `}</style>
      {children}
    </header>
  )
}
