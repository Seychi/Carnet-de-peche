'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Anneau de progression d'un défi (Sprint 63). Pattern SVG pur, cohérent avec ScoreRing
// (components/ui-v2/score-ring.tsx) : circonférence 2·π·r, offset = portion NON tracée,
// <svg> en -rotate-90 pour démarrer à midi. Animation discrète au montage (motion-safe
// → respect 100% CSS de prefers-reduced-motion, SSR-safe, aucun flash d'hydratation).
//
// DALTONIEN-SAFE (John) : l'état « relevé » est porté par l'ICÔNE (Check) + le CHIFFRE
// « done/total », jamais par la teinte seule. La couleur ne fait qu'accompagner.

const BOX = 52
const R = 22
const STROKE = 4.5

export function ChallengeRing({
  value,
  max,
  completed,
  label,
}: {
  value: number
  max: number
  completed: boolean
  /** Libellé accessible (ex. « Trois espèces ce mois : 2 sur 3 »). */
  label: string
}) {
  const safeMax = Math.max(1, max)
  const shown = Math.min(Math.max(0, value), safeMax)
  const pct = (shown / safeMax) * 100
  const c = BOX / 2
  const circumference = 2 * Math.PI * R
  const offset = circumference * (1 - pct / 100)

  // Part de circumference (vide) au 1er render → transitionne vers la vraie valeur.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <span
      role="img"
      aria-label={label}
      className="relative inline-flex shrink-0 items-center justify-center"
    >
      <svg width={BOX} height={BOX} className="-rotate-90" aria-hidden="true">
        <circle cx={c} cy={c} r={R} fill="none" strokeWidth={STROKE} stroke="var(--sand-200)" />
        <circle
          cx={c}
          cy={c}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          stroke={completed ? 'var(--score-high)' : 'var(--gold-500)'}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? offset : circumference}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out"
        />
      </svg>
      <span className="absolute inline-flex items-center justify-center">
        {completed ? (
          <Check size={20} className="text-teal-600" aria-hidden="true" />
        ) : (
          <span className={cn('font-mono text-[12px] font-semibold tabular-nums text-navy-900')}>
            {shown}/{safeMax}
          </span>
        )}
      </span>
    </span>
  )
}
