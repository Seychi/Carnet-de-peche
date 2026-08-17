import { Fish, Trophy } from 'lucide-react'
// Sous-modules CLIENT-SAFE (config/types) — surtout PAS le barrel `index`, qui
// réexporte `fetch.ts` et tire `next/headers`. Ce composant est rendu côté client.
import type { PersonalTendencies as Tendencies } from '@/lib/scoring/personal/types'
import { CONFIDENCE_LABELS } from '@/lib/scoring/personal/config'
import { PersonalTendencies } from '@/components/scoring/PersonalTendencies'

// Présentation PURE du bloc perso de la fiche espèce (sprint 23/45 — extraite au
// sprint 84). Aucune lecture de données : le markup est celui d'avant, séparé du
// fetch pour qu'un seul gabarit serve le rendu serveur (état vide, mis en cache) et
// le rendu après hydratation (données réelles du pêcheur connecté).

export type SpeciesRecord = {
  sizeCm: number | null
  measuredCm: number | null
  weightG: number | null
}

export function SpeciesPersonalView({
  data,
  record,
  labelLower,
}: {
  data: Tendencies
  record: SpeciesRecord
  labelLower: string
}) {
  // Tendance leurre dominante — mise en avant seulement quand on a assez de prises
  // (même seuil que les tendances génériques), sinon ce serait du bruit sur 1-2 prises.
  const gear = data.tendencies.find((t) => t.factor === 'gear' && t.hasData)
  const showGearHighlight = data.hasEnough && gear && gear.label

  // Record affichable : on privilégie la longueur mesurée (plus fiable), sinon la
  // taille déclarée. Le poids complète la ligne s'il existe.
  const recordCm = record.measuredCm ?? record.sizeCm
  const recordIsMeasured = record.measuredCm != null
  const showRecord = recordCm != null || record.weightG != null

  return (
    <div className="flex flex-col gap-4">
      {showGearHighlight && (
        <div className="rounded-[14px] border border-gold-500/35 bg-gold-500/[0.07] p-4">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#A87C20]">
            <Fish size={13} strokeWidth={1.8} aria-hidden="true" /> Ton meilleur leurre
          </span>
          <p className="mt-1.5 text-[14px] leading-snug text-navy-900">
            Sur {labelLower}, tu sors surtout au{' '}
            <strong className="font-semibold">{gear.label}</strong>.
          </p>
          <p className="mt-1 font-mono text-[11.5px] text-ink-500">
            <span className="font-semibold text-navy-900">{Math.round(gear.share * 100)} %</span> de
            tes prises, {CONFIDENCE_LABELS[gear.confidence]}
          </p>
        </div>
      )}

      {showRecord && (
        <div className="rounded-[14px] border border-sand-200 bg-white p-4">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-teal-700">
            <Trophy size={13} strokeWidth={1.8} aria-hidden="true" /> Ton record de {labelLower}
          </span>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            {recordCm != null && (
              <span className="font-mono text-xl font-bold leading-none text-navy-900">
                {recordCm} cm
              </span>
            )}
            {recordCm != null && recordIsMeasured && (
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-400">
                longueur mesurée
              </span>
            )}
            {record.weightG != null && (
              <span className="font-mono text-[13px] font-semibold text-ink-600">
                {(record.weightG / 1000).toFixed(2).replace('.', ',')} kg
              </span>
            )}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
            Ton record perso, privé. Calculé sur tes vraies prises.
          </p>
        </div>
      )}

      <PersonalTendencies data={data} speciesLabel={labelLower} />
    </div>
  )
}
