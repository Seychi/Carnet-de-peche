'use client'

import { useState } from 'react'
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

type Props = {
  points: TidePoint[]
  extrema: TideExtremum[]
  currentHourIdx: number
}

type ChartPayload = { h: number; m: number }

export default function TideChart({ points, extrema, currentHourIdx }: Props) {
  const [mode, setMode] = useState<'chart' | 'table'>('chart')

  if (points.length === 0) return null

  const data: ChartPayload[] = points.map(p => ({ h: p.hour, m: p.height_m }))

  const heights = points.map(p => p.height_m)
  const minH = Math.min(...heights)
  const maxH = Math.max(...heights)
  const pad = Math.max((maxH - minH) * 0.2, 0.1)
  const yMin = Math.floor((minH - pad) * 10) / 10
  const yMax = Math.ceil((maxH + pad) * 10) / 10

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-navy-900">Marées du jour</h3>
        <div className="flex rounded-lg overflow-hidden border border-ink-200 text-xs font-medium">
          <button
            onClick={() => setMode('chart')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'chart'
                ? 'bg-navy-900 text-white'
                : 'bg-white text-ink-500 hover:bg-ink-50'
            }`}
          >
            Courbe
          </button>
          <button
            onClick={() => setMode('table')}
            className={`px-3 py-1.5 transition-colors ${
              mode === 'table'
                ? 'bg-navy-900 text-white'
                : 'bg-white text-ink-500 hover:bg-ink-50'
            }`}
          >
            Grille
          </button>
        </div>
      </div>

      {mode === 'chart' ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 24, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#14B8A6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#EDF1F4"
              vertical={false}
            />
            <XAxis
              dataKey="h"
              tickFormatter={(v: number) => `${v}h`}
              tick={{ fontSize: 10, fill: '#5C6F7A' }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v: number) => `${v.toFixed(1)}m`}
              tick={{ fontSize: 10, fill: '#5C6F7A' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [
                typeof value === 'number' ? `${value.toFixed(2)} m` : '—',
                'Hauteur',
              ]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) =>
                typeof label === 'number' ? `${label}h00` : String(label)
              }
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #D7DEE3',
                boxShadow: '0 2px 8px rgba(0,0,0,.06)',
              }}
            />

            {/* Ligne "Maintenant" */}
            {currentHourIdx >= 0 && currentHourIdx <= 23 && (
              <ReferenceLine
                x={currentHourIdx}
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

            {/* Points extrêmes PM / BM */}
            {extrema.map((ex, i) => (
              <ReferenceDot
                key={i}
                x={ex.hour}
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
              <tr className="bg-ink-50 text-ink-500 border-b border-ink-100">
                <th className="text-left px-4 py-2.5 font-semibold">Heure</th>
                <th className="text-right px-4 py-2.5 font-semibold">Hauteur</th>
                <th className="text-right px-4 py-2.5 font-semibold">Marée</th>
              </tr>
            </thead>
            <tbody>
              {points
                .filter(p => p.hour % 2 === 0)
                .map(p => {
                  const ex = extrema.find(e => e.hour === p.hour)
                  const isCurrent = p.hour === currentHourIdx || p.hour === currentHourIdx - 1
                  return (
                    <tr
                      key={p.hour}
                      className={`border-b border-ink-50 last:border-0 ${
                        isCurrent ? 'bg-gold-500/10' : 'bg-white'
                      }`}
                    >
                      <td className={`px-4 py-2 font-mono ${isCurrent ? 'font-bold text-navy-900' : 'text-ink-700'}`}>
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
