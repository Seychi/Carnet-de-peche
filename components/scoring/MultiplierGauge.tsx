import { PERSONAL_SCORING_CONFIG as CFG } from '@/lib/scoring/personal-config'

const MIN = CFG.MULTIPLIER_MIN      // 0.6
const MAX = CFG.MULTIPLIER_MAX      // 1.6
const MID = CFG.MULTIPLIER_NEUTRAL  // 1.0

// Ancres couleur : rouge (0.6) → gris (1.0) → teal (1.6)
const RED  = [239, 68, 68]    // red-500
const GRAY = [156, 163, 175]  // gray-400
const TEAL = [20, 184, 166]   // teal-500

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function mix(c1: number[], c2: number[], t: number): string {
  return `rgb(${lerp(c1[0], c2[0], t)}, ${lerp(c1[1], c2[1], t)}, ${lerp(c1[2], c2[2], t)})`
}

function colorFor(value: number): string {
  const v = Math.max(MIN, Math.min(MAX, value))
  if (v <= MID) return mix(RED, GRAY, (v - MIN) / (MID - MIN))
  return mix(GRAY, TEAL, (v - MID) / (MAX - MID))
}

// ─── MultiplierGauge ──────────────────────────────────────────────────────────

export function MultiplierGauge({ label, value }: { label: string; value: number }) {
  const v = Math.max(MIN, Math.min(MAX, value))
  const pct = ((v - MIN) / (MAX - MIN)) * 100
  const neutralPct = ((MID - MIN) / (MAX - MIN)) * 100
  const color = colorFor(v)

  const title =
    `Multiplicateur ${label.toLowerCase()} : ${v.toFixed(1)}×. ` +
    `Au-dessus de 1, ce facteur est plus discriminant pour toi que la moyenne ; en-dessous, il l'est moins.`

  return (
    <div
      className="flex flex-col items-center gap-2 flex-1 min-w-0"
      role="img"
      aria-label={title}
      title={title}
    >
      <span className="text-lg font-bold tabular-nums" style={{ color }}>
        {v.toFixed(1)}×
      </span>

      <div className="relative w-full h-2 rounded-full bg-ink-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {/* Repère neutre à 1.0 */}
        <div
          className="absolute -top-1 -bottom-1 w-px bg-ink-300"
          style={{ left: `${neutralPct}%` }}
          aria-hidden
        />
      </div>

      <span className="text-xs font-medium text-ink-600">{label}</span>
    </div>
  )
}
