import type { SpeciesRecord } from '@/lib/catches/queries'
import { SPECIES_LABELS } from '@/lib/labels'
import { TagData } from '@/components/ui-v2/tag-data'
import { milestoneProgress } from '@/lib/gamification/size-milestones'

/**
 * « Tes records » : le plus beau poisson logué par espèce. DESCRIPTIF et PRIVÉ
 * (scopé serveur via la RLS auth.uid()), zéro classement inter-pêcheurs. Une espèce
 * sans taille loguée n'apparaît pas ; si le carnet est vide, le composant ne rend rien.
 *
 * Sprint 61, Bloc 1 : chaque record affiche une progression DESCRIPTIVE vers le prochain
 * jalon rond de taille (« prochain jalon 60 cm »). Ce n'est pas une promesse ni une
 * comparaison inter-pêcheurs, juste le prochain cap rond au-dessus de ton record.
 */
export function RecordsBySpecies({
  records,
  className,
}: {
  records: SpeciesRecord[]
  className?: string
}) {
  if (!records.length) return null

  return (
    <section className={`rounded-[14px] border border-sand-200 bg-white p-5 ${className ?? ''}`}>
      <TagData className="block">TES RECORDS</TagData>
      <p className="mt-1 mb-3 text-[13px] text-ink-500">
        Ton plus beau poisson par espèce, rien que pour toi.
      </p>
      <ul className="divide-y divide-slate-100">
        {records.map((r) => {
          const progress = milestoneProgress(r.species, r.maxSizeCm)
          return (
            <li key={r.species} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] text-navy-900">
                  {SPECIES_LABELS[r.species] ?? r.species}
                </span>
                <span className="flex items-baseline gap-2 text-right">
                  <span className="font-mono text-[15px] font-semibold text-navy-900">
                    {r.maxSizeCm} cm
                  </span>
                  {r.maxWeightG != null && (
                    <span className="font-mono text-[12px] text-ink-400">
                      {formatWeight(r.maxWeightG)}
                    </span>
                  )}
                </span>
              </div>

              {progress && (
                <div className="mt-2">
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-sand-100"
                    role="progressbar"
                    aria-valuenow={Math.round(progress.ratio * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Record ${r.maxSizeCm} cm, prochain jalon ${progress.next} cm`}
                  >
                    <div
                      className="h-full rounded-full bg-teal-400"
                      style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-400">
                    Prochain jalon{' '}
                    <span className="font-mono text-ink-500">{progress.next} cm</span>
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Poids en g → libellé court (kg au-delà de 1000 g, sinon g).
function formatWeight(weightG: number): string {
  if (weightG >= 1000) {
    const kg = weightG / 1000
    return `${kg.toFixed(kg >= 10 ? 0 : 1).replace('.', ',')} kg`
  }
  return `${weightG} g`
}
