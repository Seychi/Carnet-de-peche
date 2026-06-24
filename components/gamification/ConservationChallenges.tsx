import { CalendarOff, ClipboardCheck, ExternalLink, Fish, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CHALLENGES, type ChallengeDef, type ChallengeProgress } from '@/lib/gamification/challenges'
import { TagData } from '@/components/ui-v2/tag-data'

// Défis CONSERVATION (G3, D-F4) — non-compétitifs, liés à RecFishing. Calculés sur
// lecture depuis tes prises + la réglementation. Aucune comparaison entre pêcheurs.
// Daltonien-safe : l'avancement est doublé en chiffres + barre + libellé (jamais la
// teinte seule). Honnête : si une prise n'a pas de façade connue, elle est ignorée.

const ICONS: Record<ChallengeDef['icon'], LucideIcon> = {
  fish: Fish,
  'calendar-off': CalendarOff,
  'clipboard-check': ClipboardCheck,
}

export function ConservationChallenges({
  challenges,
  className,
}: {
  challenges: ChallengeProgress[]
  className?: string
}) {
  const bySlug = new Map(challenges.map((c) => [c.slug, c]))

  return (
    <section className={`rounded-[14px] border border-sand-200 bg-white p-4 ${className ?? ''}`}>
      <header className="mb-3">
        <TagData>DÉFIS CONSERVATION</TagData>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-500">
          Pêcher responsable, à ton rythme. Pas de classement, juste tes bons gestes.
        </p>
      </header>

      <ul className="space-y-2.5">
        {CHALLENGES.map((def) => {
          const prog = bySlug.get(def.slug)
          const Icon = ICONS[def.icon] ?? Fish
          const total = prog?.total ?? 0
          const done = prog?.done ?? 0
          const complete = prog?.complete ?? false
          const isReminder = def.slug === 'declare_sensitive'
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <li key={def.slug} className="rounded-[10px] border border-sand-200 bg-slate-50/50 p-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={
                    complete
                      ? 'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700'
                      : 'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500'
                  }
                  aria-hidden
                >
                  {complete ? <Check size={15} /> : <Icon size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold leading-tight text-navy-900">
                      {def.title}
                    </p>
                    {/* Statut textuel + chiffre (jamais la couleur seule). */}
                    {total === 0 ? (
                      <span className="shrink-0 font-mono text-[10.5px] text-ink-400">—</span>
                    ) : isReminder ? (
                      <span className="shrink-0 font-mono text-[10.5px] font-bold text-amber-700 tabular-nums">
                        {total} à déclarer
                      </span>
                    ) : (
                      <span
                        className={
                          complete
                            ? 'shrink-0 font-mono text-[10.5px] font-bold text-teal-800 tabular-nums'
                            : 'shrink-0 font-mono text-[10.5px] font-bold text-ink-600 tabular-nums'
                        }
                      >
                        {done}/{total}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{def.description}</p>

                  {/* Barre de progression (forme, pas seulement teinte). */}
                  {total > 0 && !isReminder && (
                    <div
                      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${def.title} : ${done} sur ${total}`}
                    >
                      <div
                        className={complete ? 'h-full bg-teal-600' : 'h-full bg-teal-400'}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {total === 0 && (
                    <p className="mt-1 text-[10.5px] italic text-ink-400">
                      Aucune prise concernée pour l’instant.
                    </p>
                  )}

                  {/* Lien RecFishing proposé quand des prises sont à déclarer. */}
                  {def.link && (isReminder ? total > 0 : false) && (
                    <a
                      href={def.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-teal-700 hover:text-teal-800"
                    >
                      {def.link.label}
                      <ExternalLink size={12} aria-hidden />
                    </a>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
