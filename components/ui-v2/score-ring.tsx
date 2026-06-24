import { cn } from '@/lib/utils'

const SIZES = {
  sm: { box: 40, r: 16, stroke: 4, text: 'text-[11px]' },
  md: { box: 48, r: 20, stroke: 4, text: 'text-[13px]' },
  lg: { box: 64, r: 27, stroke: 5, text: 'text-[17px]' },
} as const

export type ScoreRingSize = keyof typeof SIZES

/** Couleur sémantique DA v2 : ≥75 teal, 50-74 gold, <50 ink-400. */
function scoreColor(value: number): string {
  if (value >= 75) return 'var(--score-high)'
  if (value >= 50) return 'var(--score-mid)'
  return 'var(--score-low)'
}

/**
 * Anneau de score 0-100 (carte, fiches spots, cards).
 * `onDark` adapte la piste et le chiffre aux fonds navy-950.
 */
export function ScoreRing({
  value,
  size = 'md',
  onDark = false,
  className,
  label,
}: {
  value: number
  size?: ScoreRingSize
  onDark?: boolean
  className?: string
  /** Libellé accessible — défaut : « Score {value} sur 100 ». */
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const { box, r, stroke, text } = SIZES[size]
  const c = box / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - clamped / 100)
  const color = scoreColor(clamped)

  return (
    <span
      data-slot="score-ring"
      role="img"
      aria-label={label ?? `Score ${clamped} sur 100`}
      className={cn('relative inline-flex items-center justify-center', className)}
    >
      <svg width={box} height={box} className="-rotate-90" aria-hidden="true">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={onDark ? 'rgba(255,255,255,.15)' : 'var(--sand-200)'}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className={cn('absolute font-mono font-semibold tabular-nums', text)}
        style={{ color: onDark && clamped >= 75 ? 'var(--teal-300)' : color }}
      >
        {clamped}
      </span>
    </span>
  )
}
