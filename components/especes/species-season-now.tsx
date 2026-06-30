import { CalendarClock } from 'lucide-react'
import type { Facade } from '@/lib/seo/programmatic'
import { TagData } from '@/components/ui-v2/tag-data'
import { currentSeason, seasonRow, peakSeason, type SaisonRow } from '@/lib/especes/season'

// « Meilleurs créneaux PAR ESPÈCE » (sprint 23, D-B3) — dérivé de content.saisons
// (donnée éditoriale par façade), PAS d'un solunar générique. Met en avant la saison
// EN COURS et la pleine saison. Daltonien : dots ●●○ + libellé texte (jamais la teinte
// seule). Honnête : c'est le rythme saisonnier de l'espèce, le créneau fin (marée +
// solunar du jour) reste sur chaque fiche spot, qui a des conditions live.

const ACT: Record<1 | 2 | 3, { label: string; cls: string }> = {
  1: { label: 'Calme', cls: 'text-ink-500' },
  2: { label: 'Bonne', cls: 'text-gold-700' },
  3: { label: 'Pleine saison', cls: 'text-teal-700' },
}

function Dots({ activite }: { activite: 1 | 2 | 3 }) {
  return (
    <span className={`font-mono text-[11px] font-semibold uppercase tracking-[0.04em] ${ACT[activite].cls}`}>
      {'●'.repeat(activite)}
      {'○'.repeat(3 - activite)} {ACT[activite].label}
    </span>
  )
}

export function SpeciesSeasonNow({
  saisons,
  facades,
  facadeLabels,
  speciesDe,
}: {
  saisons: Record<Facade, SaisonRow[]>
  facades: Facade[]
  facadeLabels: Record<Facade, string>
  /** « du bar », « de la sole »… (article + nom, accordé). */
  speciesDe: string
}) {
  const season = currentSeason(new Date())

  // Façade dont la note de saison courante sera affichée en détail (la plus active).
  const rows = facades
    .map((f) => ({ facade: f, row: seasonRow(saisons[f], season), peak: peakSeason(saisons[f]) }))
    .filter((r) => r.row !== null)
  if (rows.length === 0) return null

  return (
    <aside className="rounded-[14px] border border-teal-500/25 bg-teal-500/[0.05] p-4">
      <TagData className="mb-2.5 flex items-center gap-1.5">
        <CalendarClock size={13} className="text-teal-600" aria-hidden="true" />
        En ce moment · {season}
      </TagData>
      <div className="flex flex-col gap-2.5">
        {rows.map(({ facade, row, peak }) => (
          <div key={facade}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink-500">
                {facadeLabels[facade]}
              </span>
              {row && <Dots activite={row.activite} />}
              {peak && (
                <span className="font-mono text-[10.5px] text-ink-400">
                  · pleine saison : {peak.saison.toLowerCase()}
                </span>
              )}
            </div>
            {row && <p className="mt-0.5 text-[13px] leading-snug text-ink-700">{row.note}</p>}
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-snug text-ink-400">
        Rythme saisonnier {speciesDe} par façade. Le créneau fin du jour (marée + solunar) est sur
        chaque fiche spot.
      </p>
    </aside>
  )
}
