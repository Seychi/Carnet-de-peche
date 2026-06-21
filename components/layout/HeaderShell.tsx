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
    // Lecture initiale au cas où la page est chargée déjà défilée (ancre, refresh).
    const update = () => setScrolled(window.scrollY > 10)
    update()

    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <header
      data-scrolled={scrolled ? 'true' : 'false'}
      className="header-shell sticky top-0 z-50"
      style={{
        background: scrolled ? 'rgba(251,248,242,.96)' : 'rgba(251,248,242,.92)',
        backdropFilter: scrolled
          ? 'saturate(180%) blur(20px)'
          : 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: scrolled
          ? 'saturate(180%) blur(20px)'
          : 'saturate(180%) blur(14px)',
        borderBottom: scrolled
          ? '1px solid rgba(10,47,61,.10)'
          : '1px solid rgba(10,47,61,.07)',
        boxShadow: scrolled ? '0 6px 24px -12px rgba(10,47,61,.22)' : '0 0 0 0 rgba(10,47,61,0)',
        transition:
          'background 220ms ease, box-shadow 220ms ease, border-color 220ms ease, backdrop-filter 220ms ease',
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
