'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Barre de progression XP dans le niveau courant (Sprint 60). L'info chiffrée est
// TOUJOURS doublée par le libellé mono « X / Y XP » → jamais portée par la seule couleur
// (John est daltonien). Animation d'entrée SOBRE (la largeur monte de 0 à la cible au
// montage) : pas de confetti, la fête arrive au Sprint 61. Lecture seule.

function fmt(n: number): string {
  // Séparateur de milliers FR (espace insécable géré par toLocaleString).
  return n.toLocaleString('fr-FR')
}

export function XpBar({
  xpIntoLevel,
  xpForNextLevel,
  onDark = false,
  className,
}: {
  xpIntoLevel: number
  xpForNextLevel: number | null
  onDark?: boolean
  className?: string
}) {
  const isMax = xpForNextLevel == null || xpForNextLevel <= 0
  const target = isMax
    ? 100
    : Math.min(100, Math.max(0, (xpIntoLevel / xpForNextLevel) * 100))

  // Largeur animée : 0 → cible au montage (transition CSS sur width).
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div
        className={cn(
          'h-2 w-full overflow-hidden rounded-full',
          onDark ? 'bg-white/15' : 'bg-sand-200',
        )}
        role="progressbar"
        aria-valuenow={Math.round(target)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          isMax
            ? 'Palier maximum atteint'
            : `${fmt(xpIntoLevel)} sur ${fmt(xpForNextLevel!)} XP vers le palier suivant`
        }
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
            onDark ? 'bg-teal-300' : 'bg-teal-500',
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      <p
        className={cn(
          'font-mono text-[11px] leading-none tabular-nums',
          onDark ? 'text-white/60' : 'text-ink-500',
        )}
      >
        {isMax ? 'Palier maximum' : `${fmt(xpIntoLevel)} / ${fmt(xpForNextLevel!)} XP`}
      </p>
    </div>
  )
}
