'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts'
import type { TidePoint, TideExtremum } from '@/lib/conditions/spot-forecast'
import {
  tideTrendAt,
  trendLabel,
  upcomingExtrema,
  refineExtremumHour,
  formatHourFraction,
  formatCountdown,
  type TideTrend,
} from '@/lib/conditions/tide'

type Props = {
  points: TidePoint[]
  extrema: TideExtremum[]
  /** Heure courante (entier 0-23) calculée côté serveur — graine SSR. */
  currentHourIdx: number
  /**
   * Offset de calibration (minutes) à ajouter aux heures de PM/BM pour les caler sur
   * le port de référence SHOM (sprint 38). 0 = pas de calibration (façade non auditée).
   */
  offsetMinutes?: number
}

type ChartPayload = { h: number; m: number }

// Heure de Paris fractionnaire (14h32 → 14.533) depuis une Date, côté client.
function parisHourFraction(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const h = parseInt(parts.find((p) => p.type === 'hour')!.value, 10)
  const m = parseInt(parts.find((p) => p.type === 'minute')!.value, 10)
  return (h % 24) + m / 60
}

const TREND_ICON: Record<TideTrend, typeof ArrowUpRight> = {
  rising: ArrowUpRight,
  falling: ArrowDownRight,
  slack: Minus,
}

const TREND_COLOR: Record<TideTrend, string> = {
  rising: 'text-teal-600',
  falling: 'text-coral-500',
  slack: 'text-ink-400',
}

export default function TideChart({ points, extrema, currentHourIdx, offsetMinutes = 0 }: Props) {
  const [mode, setMode] = useState<'chart' | 'table'>('chart')
  // Horloge live : se met à jour chaque minute pour faire bouger le curseur
  // « maintenant » et le compte à rebours PM/BM sans recharger la page.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (points.length === 0) return null

  // Avant l'hydratation client, on retombe sur la graine serveur (entier).
  const currentHour = now ? parisHourFraction(now) : currentHourIdx

  const data: ChartPayload[] = points.map((p) => ({ h: p.hour, m: p.height_m }))

  const heights = points.map((p) => p.height_m)
  const minH = Math.min(...heights)
  const maxH = Math.max(...heights)
  const pad = Math.max((maxH - minH) * 0.2, 0.1)
  const yMin = Math.floor((minH - pad) * 10) / 10
  const yMax = Math.ceil((maxH + pad) * 10) / 10

  // Calibration par port (sprint 38) : les heures de PM/BM dérivées d'Open-Meteo sont
  // en avance d'un biais ~constant par port. On les cale sur le SHOM en ajoutant
  // offsetMinutes (= -biais). « Prochain extremum » évalué dans le temps CORRIGÉ :
  // extremum corrigé >= maintenant <=> extremum brut >= (maintenant - offset). Puis on
  // décale l'heure affichée de +offset. La courbe reste le modèle horaire Open-Meteo.
  const offsetHours = offsetMinutes / 60
  const refHour = currentHour - offsetHours
  const { high, low } = upcomingExtrema(points, extrema, refHour)
  const nextHigh = high ? { ...high, hourFraction: high.hourFraction + offsetHours } : null
  const nextLow = low ? { ...low, hourFraction: low.hourFraction + offsetHours } : null
  const nowTrend = tideTrendAt(points, refHour)
  const NowTrendIcon = TREND_ICON[nowTrend]

  // Extrêmes PM/BM dans le temps AFFICHÉ (corrigé du même offset que les cartes
  // texte) : heure sub-horaire raffinée + offset. Sert le ReferenceDot du graphe
  // ET la grille, pour que les heures coïncident partout sur le même écran.
  const displayExtrema = extrema.map((ex) => {
    const displayHour = refineExtremumHour(points, ex.hour) + offsetHours
    const clamped = Math.max(0, Math.min(23, displayHour))
    return {
      type: ex.type,
      height_m: ex.height_m,
      // x sur le graphe (heure affichée), borné à l'axe 0-23.
      x: clamped,
      // La grille n'affiche que les heures paires : on rattache l'extremum à la
      // ligne paire la plus proche de l'heure affichée (bornée à 0-22), pour que
      // le tag PM/BM tombe au plus près du point du graphe.
      hourBucket: Math.max(0, Math.min(22, Math.round(clamped / 2) * 2)),
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const h = typeof label === 'number' ? label : Number(label)
    const value = payload[0]?.value
    const trend = tideTrendAt(points, h)
    const Icon = TREND_ICON[trend]
    return (
      <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-[0_2px_8px_rgba(0,0,0,.06)]">
        <p className="font-mono font-semibold text-navy-900">{h}h00</p>
        <p className="font-mono text-ink-700">
          {typeof value === 'number' ? `${value.toFixed(2)} m` : '—'}
        </p>
        <p className={`mt-0.5 flex items-center gap-1 ${TREND_COLOR[trend]}`}>
          <Icon size={12} aria-hidden />
          {trendLabel(trend)}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy-900">Marées du jour</h3>
        <div className="flex overflow-hidden rounded-lg border border-ink-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('chart')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'chart' ? 'bg-navy-900 text-white' : 'bg-white text-ink-500 hover:bg-ink-50'
            }`}
          >
            Courbe
          </button>
          <button
            type="button"
            onClick={() => setMode('table')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'table' ? 'bg-navy-900 text-white' : 'bg-white text-ink-500 hover:bg-ink-50'
            }`}
          >
            Grille
          </button>
        </div>
      </div>

      {/* Bandeau live : tendance actuelle + prochaines PM / BM avec compte à rebours */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-[10px] border border-ink-100 bg-white px-3 py-2">
          <NowTrendIcon size={16} className={TREND_COLOR[nowTrend]} aria-hidden />
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-500">
              Maintenant
            </p>
            <p className="text-[13px] font-semibold text-navy-900">{trendLabel(nowTrend)}</p>
          </div>
        </div>

        <ExtremumCard
          label="Pleine mer"
          arrow="↑"
          accent="text-navy-900"
          extremum={nextHigh}
          currentHour={currentHour}
        />
        <ExtremumCard
          label="Basse mer"
          arrow="↓"
          accent="text-navy-600"
          extremum={nextLow}
          currentHour={currentHour}
        />
      </div>

      {mode === 'chart' ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 24, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F4" vertical={false} />
            <XAxis
              dataKey="h"
              type="number"
              domain={[0, 23]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              tickFormatter={(v: number) => `${v}h`}
              tick={{ fontSize: 10, fill: '#5C6F7A' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => `${v.toFixed(1)}m`}
              tick={{ fontSize: 10, fill: '#5C6F7A' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip content={renderTooltip} />

            {/* Ligne « Maintenant » (heure fractionnaire live) */}
            {currentHour >= 0 && currentHour < 24 && (
              <ReferenceLine
                x={currentHour}
                stroke="#E5604F"
                strokeDasharray="4 3"
                strokeWidth={2}
                label={{
                  value: 'Maintenant',
                  position: 'insideTopRight',
                  fontSize: 9,
                  fill: '#E5604F',
                  fontWeight: 600,
                }}
              />
            )}

            {/* Points extrêmes PM / BM — placés sur l'heure AFFICHÉE (corrigée
                de l'offset de calibration), pour coïncider avec les cartes texte. */}
            {displayExtrema.map((ex, i) => (
              <ReferenceDot
                key={i}
                x={ex.x}
                y={ex.height_m}
                r={5}
                fill={ex.type === 'high' ? '#0A2F3D' : '#3B8AA8'}
                stroke="white"
                strokeWidth={2}
                label={{
                  value: `${ex.type === 'high' ? '↑' : '↓'} ${ex.height_m.toFixed(2)} m`,
                  position: ex.type === 'high' ? 'top' : 'bottom',
                  fontSize: 9,
                  fill: ex.type === 'high' ? '#0A2F3D' : '#1A5168',
                  fontWeight: 600,
                }}
              />
            ))}

            <Area
              type="monotone"
              dataKey="m"
              stroke="#14B8A6"
              strokeWidth={2.5}
              fill="url(#tideGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#14B8A6', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-ink-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50 text-ink-500">
                <th className="px-4 py-2.5 text-left font-semibold">Heure</th>
                <th className="px-4 py-2.5 text-right font-semibold">Hauteur</th>
                <th className="px-4 py-2.5 text-right font-semibold">Marée</th>
              </tr>
            </thead>
            <tbody>
              {points
                .filter((p) => p.hour % 2 === 0)
                .map((p) => {
                  // On matche l'extremum sur son bucket horaire AFFICHÉ (corrigé de
                  // l'offset), cohérent avec le graphe et les cartes texte.
                  const ex = displayExtrema.find((e) => e.hourBucket === p.hour)
                  const isCurrent = Math.floor(currentHour) === p.hour || Math.floor(currentHour) === p.hour + 1
                  return (
                    <tr
                      key={p.hour}
                      className={`border-b border-ink-50 last:border-0 ${
                        isCurrent ? 'bg-gold-500/10' : 'bg-white'
                      }`}
                    >
                      <td
                        className={`px-4 py-2 font-mono ${
                          isCurrent ? 'font-bold text-navy-900' : 'text-ink-700'
                        }`}
                      >
                        {p.hour}h{isCurrent ? ' ←' : ''}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-ink-900">
                        {p.height_m.toFixed(2)} m
                      </td>
                      <td className="px-4 py-2 text-right">
                        {ex ? (
                          <span
                            className={`font-bold ${
                              ex.type === 'high' ? 'text-navy-900' : 'text-navy-600'
                            }`}
                          >
                            {ex.type === 'high' ? '↑ PM' : '↓ BM'}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Carte PM/BM avec compte à rebours ────────────────────────────────────────

function ExtremumCard({
  label,
  arrow,
  accent,
  extremum,
  currentHour,
}: {
  label: string
  arrow: string
  accent: string
  extremum: { hourFraction: number; height_m: number } | null
  currentHour: number
}) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-ink-100 bg-white px-3 py-2">
      <span className={`text-base font-bold ${accent}`} aria-hidden>
        {arrow}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-500">
          {label}
        </p>
        {extremum ? (
          <p className="text-[13px] font-semibold text-navy-900">
            <span className="font-mono">{formatHourFraction(extremum.hourFraction)}</span>
            <span className="ml-1.5 font-normal text-ink-500">
              {formatCountdown(extremum.hourFraction - currentHour)}
            </span>
          </p>
        ) : (
          <p className="text-[13px] text-ink-400">demain</p>
        )}
      </div>
    </div>
  )
}
