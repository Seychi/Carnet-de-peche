'use client'

import { useEffect, useRef } from 'react'

const BAR_HEIGHT_VAR = '--map-bottom-bar-height'

/**
 * Publie la hauteur RÉELLE de la barre du bas de `/carte` (mur d'inscription ou
 * bandeau upsell) dans `--map-bottom-bar-height`, sur `<html>`.
 *
 * Sprint 79, Bloc 1. La colonne de boutons flottants de la carte s'y adosse via
 * `.map-fab-stack` (cf `app/globals.css`) au lieu de passer par-dessus. On mesure
 * au lieu de coder un décalage en dur : la barre change de hauteur quand sa copie
 * passe sur deux lignes en 390 px, exactement comme le bandeau de consentement.
 *
 * `active` doit valoir `false` dès que la barre n'est plus rendue : la variable
 * est alors retirée, et la colonne redescend à sa position naturelle.
 */
export function useBottomBarHeight<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!active || !el) return

    const root = document.documentElement
    const apply = () => {
      root.style.setProperty(BAR_HEIGHT_VAR, `${el.offsetHeight}px`)
    }
    apply()

    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty(BAR_HEIGHT_VAR)
    }
  }, [active])

  return ref
}
