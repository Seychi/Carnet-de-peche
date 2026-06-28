import type { SpeciesRecord } from '@/lib/catches/queries'
import { SPECIES_LABELS } from '@/lib/labels'
import { TagData } from '@/components/ui-v2/tag-data'

/**
 * « Tes records » : le plus beau poisson logué par espèce. DESCRIPTIF et PRIVÉ
 * (scopé serveur via la RLS auth.uid()), zéro classement inter-pêcheurs. Une espèce
 * sans taille loguée n'apparaît pas ; si le carnet est vide, le composant ne rend rien.
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
        {records.map((r) => (
          <li key={r.species} className="flex items-baseline justify-between gap-3 py-2">
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
          </li>
        ))}
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
