import { Waves } from 'lucide-react'
import { degreesToCompass, waveLabel } from '@/lib/conditions/format'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'

type Props = {
  waves: SpotConditions['waves']
  swell: SpotConditions['swell']
}

export default function WavesCard({ waves, swell }: Props) {
  const hasWaves = waves.height_m !== null
  const hasSwell = (swell.height_m ?? 0) > 0.1

  return (
    <div className="bg-white border border-sand-200 rounded-[14px] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Waves size={16} className="text-teal-500" />
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">Vagues</span>
      </div>

      {!hasWaves ? (
        <p className="text-sm text-ink-500">Données non disponibles</p>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="font-mono text-3xl font-semibold text-navy-900">
              {waves.height_m!.toFixed(1)}
            </span>
            <span className="text-sm text-ink-500 font-medium">m</span>
          </div>

          <p className="text-sm font-semibold text-teal-700 mb-3">
            {waveLabel(waves.height_m!)}
          </p>

          <dl className="flex flex-col gap-2 text-sm">
            {waves.direction_deg !== null && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Direction</dt>
                <dd className="font-mono font-medium text-ink-900">
                  {degreesToCompass(waves.direction_deg)} ({Math.round(waves.direction_deg)}°)
                </dd>
              </div>
            )}
            {waves.period_s !== null && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Période</dt>
                <dd className="font-mono font-medium text-ink-900">{Math.round(waves.period_s)} s</dd>
              </div>
            )}
            {waves.water_temp_c !== null && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Temp. eau</dt>
                <dd className="font-mono font-medium text-ink-900">{Math.round(waves.water_temp_c)}°C</dd>
              </div>
            )}
          </dl>

          {hasSwell && (
            <div className="mt-4 pt-4 border-t border-ink-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2">Houle</p>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">Hauteur</dt>
                  <dd className="font-mono font-medium text-ink-900">{swell.height_m!.toFixed(1)} m</dd>
                </div>
                {swell.period_s !== null && (
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Période</dt>
                    <dd className="font-mono font-medium text-ink-900">{Math.round(swell.period_s)} s</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  )
}
