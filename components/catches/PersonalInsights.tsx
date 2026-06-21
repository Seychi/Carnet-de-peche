import { Sun, Calendar, CalendarDays, Sparkles } from 'lucide-react'
import type { PersonalInsightsResult } from '@/lib/catches/insights'

const ICONS = {
  sun: Sun,
  calendar: Calendar,
  week: CalendarDays,
} as const

/**
 * Tes tendances perso — calculées depuis tes vraies prises (lib/catches/insights).
 * Honnête : si l'historique ne suffit pas, on invite à loguer plutôt que d'inventer.
 */
export function PersonalInsights({ data, className }: { data: PersonalInsightsResult; className?: string }) {
  // Carnet vide : la page a déjà son propre état vide, on ne dit rien ici.
  if (data.totalCount === 0) return null

  return (
    <section className={`rounded-[14px] border border-sand-200 bg-white p-5 ${className ?? ''}`}>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={15} className="text-teal-500" aria-hidden />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">
          Tes tendances
        </span>
      </div>

      {data.insights.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-ink-500">
          Continue à loguer tes prises (avec la taille et l&apos;heure) : dès que l&apos;historique
          le permet, tes tendances jour/nuit, ton meilleur mois et ton jour fétiche apparaîtront ici.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.insights.map((ins) => {
            const Icon = ICONS[ins.icon]
            return (
              <li key={ins.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-sand-50">
                  <Icon size={15} className="text-teal-600" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] leading-snug text-navy-900">{ins.text}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-400">{ins.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
