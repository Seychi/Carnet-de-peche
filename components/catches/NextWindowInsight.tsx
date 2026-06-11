import Link from 'next/link'
import { getDeptNextWindow } from '@/lib/conditions/dept-window'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { TagData } from '@/components/ui-v2/tag-data'
import type { QualityLevel } from '@/lib/solunar/types'

const QUALITY_LABELS: Record<QualityLevel, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  bonne: 'Bonne',
  tres_bonne: 'Très bonne',
  exceptionnelle: 'Exceptionnelle',
}

function fmtDay(iso: string): string {
  const day = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso))
  // « aujourd'hui » / « demain » si c'est le cas
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(iso))
  if (dateKey === todayKey) return 'Aujourd’hui'
  const tomorrowKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date(Date.now() + 86_400_000),
  )
  if (dateKey === tomorrowKey) return 'Demain'
  return day.charAt(0).toUpperCase() + day.slice(1)
}

/**
 * Card insight « live » du carnet (DA v2) : le prochain bon créneau du
 * département, anneau de score + données mono. Réutilise le même calcul
 * caché que le bandeau instruments — zéro nouvelle API.
 */
export async function NextWindowInsight({ dept }: { dept: string }) {
  const window = await getDeptNextWindow(dept)
  if (!window) return null

  return (
    <div className="mb-6 flex items-center gap-4 rounded-[14px] border border-sand-200 bg-white p-4 shadow-[inset_3px_0_0_var(--teal-500)] sm:gap-5 sm:p-5">
      <ScoreRing value={window.score} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-navy-900 sm:text-[15px]">
          {fmtDay(window.startTimeISO)}, ton prochain bon créneau.
        </p>
        <TagData className="mt-0.5 block">
          {window.startLocal} → {window.endLocal} · {QUALITY_LABELS[window.quality]}
        </TagData>
      </div>
      <Link
        href="/carte"
        className="hidden shrink-0 items-center rounded-lg bg-navy-900 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-800 sm:inline-flex"
      >
        Voir où
      </Link>
    </div>
  )
}
