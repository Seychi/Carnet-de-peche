'use client'

import { useEffect, useState } from 'react'

export type MotionPreference = {
  /** L'utilisateur demande moins d'animation (`prefers-reduced-motion: reduce`). */
  reduceMotion: boolean
  /** Pointeur grossier (tactile) — coupe les effets liés au curseur (magnetic, glow). */
  isTouch: boolean
  /** Le motion « scroll » lourd est-il autorisé ? (= monté côté client ET pas reduce). */
  enabled: boolean
}

// Défaut CONSERVATEUR avant montage / côté serveur : on suppose `reduceMotion`
// → le contenu est rendu visible, sans animation, tant que le client n'a pas
// confirmé la préférence. Aucun flash d'invisibilité si JS est lent/absent.
const SERVER_DEFAULT: MotionPreference = { reduceMotion: true, isTouch: false, enabled: false }

/**
 * Préférence de motion réactive (sprint 34, WS-1). SSR-safe : renvoie un défaut
 * conservateur au 1er rendu, puis se met à jour après hydratation et écoute les
 * changements (l'utilisateur peut basculer reduced-motion sans recharger).
 * Note (décision John) : le motion scroll reste actif sur tactile (hero live mobile) ;
 * seul `isTouch` désactive les effets POINTEUR (magnetic/glow), pas le scroll.
 */
export function useMotionPreference(): MotionPreference {
  const [pref, setPref] = useState<MotionPreference>(SERVER_DEFAULT)

  useEffect(() => {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqTouch = window.matchMedia('(pointer: coarse)')
    const update = () => {
      const reduceMotion = mqReduce.matches
      setPref({ reduceMotion, isTouch: mqTouch.matches, enabled: !reduceMotion })
    }
    update()
    mqReduce.addEventListener('change', update)
    mqTouch.addEventListener('change', update)
    return () => {
      mqReduce.removeEventListener('change', update)
      mqTouch.removeEventListener('change', update)
    }
  }, [])

  return pref
}
