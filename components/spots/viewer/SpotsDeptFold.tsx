'use client'

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { hasAuthCookieHint } from './auth-hint'
import { useSpotViewer } from './SpotViewerProvider'

/**
 * Repli des spots d'un département sur `/spots` (sprint 77, Bloc 3 → sprint 84).
 *
 * Comportement produit INCHANGÉ :
 *  - sans compte : les spots au-delà des 5 premiers sont repliés dans un `<details>`
 *    NATIF. Point entier du bloc : les liens repliés sont DANS le document servi,
 *    Google les suit, et l'inventaire indexable ne perd pas une ligne. C'est aussi
 *    ce qui distingue le motif du cloaking (même HTML pour tous, le repli est un
 *    comportement de navigateur). Ne JAMAIS remplacer ça par un montage au clic ;
 *  - avec un compte : la liste est dépliée, sans `<details>` ni bouton.
 *
 * Ce qui change au sprint 84 : la page est STATIQUE, son HTML est donc celui d'un
 * visiteur sans compte. Le dépliage se fait ici, dans un `useLayoutEffect` —
 * c'est-à-dire AVANT la première peinture — pour qu'un connecté ne voie pas la
 * liste se replier puis se déplier sous ses yeux.
 */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function SpotsDeptFold({
  summary,
  children,
}: {
  summary: ReactNode
  children: ReactNode
}) {
  const { authed, resolved } = useSpotViewer()
  const [hinted, setHinted] = useState(false)

  useIsomorphicLayoutEffect(() => {
    if (hasAuthCookieHint()) setHinted(true)
  }, [])

  const unfolded = resolved ? authed : hinted

  const grid = (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  )

  if (unfolded) return grid

  return (
    <details className="mt-4">
      <summary className="cursor-pointer select-none rounded-[10px] border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:border-teal-500/40 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
        {summary}
      </summary>
      {grid}
    </details>
  )
}
