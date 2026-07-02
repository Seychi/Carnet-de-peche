import Link from 'next/link'
import { ArrowRight, BellRing } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { parisDateKey, nextDateKey } from '@/lib/alerts/paris'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { TagData } from '@/components/ui-v2/tag-data'

// ─── « Ta prochaine fenêtre à [spot] » (sprint 72, Bloc 3) ────────────────────
// Ne s'affiche QUE si une alerte récente/à venir existe pour le viewer (lecture
// alerts_sent, RLS select own). Aucune coordonnée : nom + slug du spot uniquement
// (embed spots via FK ; un spot devenu invisible → embed null → rien).
// Le score affiché est celui réellement calculé par le moteur (jamais inventé).

type AlertRow = {
  spot_id: string
  window_date: string
  score: number
  kind: string
  spots: { name: string; slug: string } | null
}

// « Aujourd'hui » / « Demain » / date FR, en jour civil de Paris.
function windowDayLabel(windowDate: string, todayKey: string): string {
  if (windowDate === todayKey) return 'Aujourd’hui'
  if (windowDate === nextDateKey(todayKey)) return 'Demain'
  const [y, m, d] = windowDate.split('-').map(Number)
  const s = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function NextAlertWindow() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const todayKey = parisDateKey(new Date())

  // La plus proche fenêtre non passée (l'alerte part la veille → window_date
  // vaut au plus demain, mais on reste générique avec gte + order).
  const { data } = await supabase
    .from('alerts_sent')
    .select('spot_id, window_date, score, kind, spots(name, slug)')
    .eq('user_id', user.id)
    .gte('window_date', todayKey)
    .order('window_date', { ascending: true })
    .limit(1)

  // Embed many-to-one : objet au runtime ; typegen ambigu (FK → spots + vue) → unknown.
  const row = (data?.[0] ?? null) as unknown as AlertRow | null
  if (!row || !row.spots) return null

  const dayLabel = windowDayLabel(row.window_date, todayKey)
  const isPerso = row.kind === 'perso'

  return (
    <section className="rounded-[18px] border border-gold-500/40 bg-white p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-gold-700">
          <BellRing size={13} aria-hidden="true" />
          TA PROCHAINE FENÊTRE
        </h2>
      </div>
      <div className="flex items-center gap-4 rounded-[14px] border border-sand-200 bg-sand-50/60 p-4 shadow-[inset_3px_0_0_var(--gold-500)]">
        <ScoreRing value={row.score} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-navy-900">
            {dayLabel} à {row.spots.name}
          </p>
          <TagData className="mt-0.5 block">
            {isPerso
              ? 'TES CONDITIONS ARRIVENT'
              : 'GRANDE MARÉE · ALERTE GÉNÉRIQUE'}
          </TagData>
        </div>
        <Link
          href={`/spots/${row.spots.slug}?utm_source=spot_alert&utm_medium=inapp`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-navy-900 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          Voir le spot <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
      {!isPerso ? (
        <p className="mt-2 text-xs text-ink-500 leading-relaxed">
          Alerte générique (pas encore assez de prises loguées) : logue tes sorties
          pour la personnaliser.
        </p>
      ) : null}
    </section>
  )
}
