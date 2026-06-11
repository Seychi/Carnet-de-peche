import { cn } from '@/lib/utils'

export type TideSparklinePoint = { hour: number; height_m: number }
export type TideSparklineExtremum = { type: 'high' | 'low'; hour: number }

const W = 260
const H = 64
const PAD_Y = 12

/** Convertit l'heure (0-24, décimales OK) en x du viewBox. */
function x(hour: number): number {
  return (hour / 24) * W
}

/** Path lissé (Catmull-Rom → Bézier) sur les points de marée. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

function fmtHour(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Courbe de marée compacte — l'élément le plus différenciant du produit
 * (hero, fiche spot, cards). Curseur « maintenant » coral + labels PM/BM mono.
 * Présentation seulement : les données viennent d'Open-Meteo (sprint 9.5).
 */
export function TideSparkline({
  points,
  extrema = [],
  nowHour = null,
  onDark = false,
  showLabels = true,
  className,
}: {
  points: TideSparklinePoint[]
  extrema?: TideSparklineExtremum[]
  /** Heure courante (0-24, décimales OK) — null pour masquer le curseur. */
  nowHour?: number | null
  onDark?: boolean
  showLabels?: boolean
  className?: string
}) {
  if (points.length < 2) return null

  const heights = points.map((p) => p.height_m)
  const min = Math.min(...heights)
  const max = Math.max(...heights)
  const span = max - min || 1
  const y = (h: number) => H - PAD_Y - ((h - min) / span) * (H - PAD_Y * 2)

  const pts = points.map((p) => ({ x: x(p.hour), y: y(p.height_m) }))
  const d = smoothPath(pts)

  // Hauteur interpolée linéairement à une heure donnée (pour le point « maintenant »).
  const heightAt = (hour: number): number => {
    const after = points.findIndex((p) => p.hour >= hour)
    if (after <= 0) return points[after === 0 ? 0 : points.length - 1].height_m
    const a = points[after - 1]
    const b = points[after]
    const t = (hour - a.hour) / (b.hour - a.hour || 1)
    return a.height_m + (b.height_m - a.height_m) * t
  }

  const labels = showLabels
    ? extrema.filter((e) => e.hour >= 0.8 && e.hour <= 23.2)
    : []

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn('block w-full', className)}
      role="img"
      aria-label="Courbe de marée du jour"
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--teal-500)"
        strokeWidth={1.8}
        vectorEffect="non-scaling-stroke"
      />
      {nowHour != null && nowHour >= 0 && nowHour <= 24 && (
        <>
          <line
            x1={x(nowHour)}
            y1={4}
            x2={x(nowHour)}
            y2={H - 6}
            stroke="var(--coral-500)"
            strokeWidth={1.2}
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={x(nowHour)} cy={y(heightAt(nowHour))} r={3.5} fill="var(--coral-500)" />
        </>
      )}
      {labels.map((e) => (
        <text
          key={`${e.type}-${e.hour}`}
          x={x(e.hour)}
          y={e.type === 'high' ? 9 : H - 2}
          textAnchor="middle"
          fontSize={8}
          style={{ fontFamily: 'var(--font-mono)' }}
          fill={
            e.type === 'high'
              ? onDark
                ? 'var(--teal-300)'
                : 'var(--teal-600)'
              : 'var(--ink-400)'
          }
        >
          {e.type === 'high' ? 'PM' : 'BM'} {fmtHour(e.hour)}
        </text>
      ))}
    </svg>
  )
}
