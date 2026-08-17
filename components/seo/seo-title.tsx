import type * as React from 'react'
import { cn } from '@/lib/utils'

// Titre des pages SEO (sprint 87, Bloc 1).
//
// Le `h1` global d'`app/globals.css` vaut `clamp(32px, 8vw, 72px)` avec un
// `line-height` de 1.05. Sur les gabarits SEO, ces titres sont LONGS par
// construction (« Pêche de la dorade royale au surfcasting dans le Morbihan »,
// 56 caractères) : à 390 px, ce clamp les étale sur 4 lignes et le premier écran
// ne contient plus que le titre. 82 % du trafic est mobile.
//
// ⚠️ On NE corrige PAS le clamp global : il habille aussi le hero de la home
// (refonte sprint 34, WebGL + GSAP) et les index. Le titre SEO devient un
// composant, le CSS global ne bouge pas.
//
// `data-fold="title"` est le contrat lu par `scripts/measure-fold.mjs` et par le
// garde-fou `e2e/10-pli-mobile.spec.ts`.
//
// Server component : aucun état, aucun cookie, rien qui rende la route dynamique
// (invariant du sprint 84, cf CLAUDE.md §6).

export function SeoTitle({
  children,
  tone = 'on-dark',
  className,
}: {
  children: React.ReactNode
  /** 'on-dark' = hero navy (défaut), 'on-light' = fond sable. */
  tone?: 'on-dark' | 'on-light'
  className?: string
}) {
  return (
    <h1
      data-fold="title"
      className={cn(
        'font-display text-[clamp(25px,5.6vw,42px)] leading-[1.12]',
        tone === 'on-dark' ? 'text-white' : 'text-navy-900',
        className,
      )}
    >
      {children}
    </h1>
  )
}
