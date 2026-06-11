import { cn } from '@/lib/utils'

/** Paths repris des maquettes (docs/maquette-v2/index.html) — 5 isobathes. */
const PATHS = [
  { d: 'M-50 580 C 250 480, 480 640, 760 540 S 1240 460, 1460 560', opacity: 1 },
  { d: 'M-50 500 C 230 400, 500 560, 780 460 S 1230 380, 1460 470', opacity: 0.75 },
  { d: 'M-50 420 C 220 330, 520 480, 800 390 S 1230 300, 1460 390', opacity: 0.55 },
  { d: 'M-50 340 C 210 260, 540 400, 820 320 S 1230 230, 1460 310', opacity: 0.4 },
  { d: 'M-50 260 C 200 190, 560 320, 840 250 S 1230 160, 1460 230', opacity: 0.25 },
] as const

const LABELS = [
  { x: 1090, y: 448, text: '— 5 m' },
  { x: 1110, y: 368, text: '— 10 m' },
  { x: 1130, y: 288, text: '— 15 m' },
] as const

/**
 * Isobathes décoratives — LE motif identitaire DA v2 (carte marine, pas vague
 * générique). À poser en fond des sections sombres (hero, footer).
 * Décoratif pur : aria-hidden, pointer-events none.
 */
export function Bathy({
  density = 5,
  opacity = 0.5,
  withLabels = false,
  className,
}: {
  /** Nombre d'isobathes (1-5). */
  density?: 1 | 2 | 3 | 4 | 5
  opacity?: number
  withLabels?: boolean
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{ opacity }}
    >
      <svg
        viewBox="0 0 1400 700"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <g fill="none" stroke="var(--navy-700)" strokeWidth={1}>
          {PATHS.slice(0, density).map((p) => (
            <path key={p.d} d={p.d} opacity={p.opacity} />
          ))}
        </g>
        {withLabels &&
          LABELS.slice(0, Math.max(1, density - 2)).map((l) => (
            <text
              key={l.text}
              x={l.x}
              y={l.y}
              fontSize={11}
              fill="var(--navy-700)"
              opacity={0.9}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {l.text}
            </text>
          ))}
      </svg>
    </div>
  )
}
