import { createClient } from '@/lib/supabase/server'

// ─── Insights perso honnêtes ─────────────────────────────────────────────────
// 100 % calculés depuis les VRAIES prises de l'utilisateur (vue catches_for_viewer,
// filtrée sur user_id). Chaque insight est gardé par un seuil d'échantillon et
// expose sa taille d'échantillon (vérifiable). Aucun chiffre inventé : si les
// données ne suffisent pas, l'insight n'apparaît tout simplement pas.

export type PersonalInsight = {
  id: 'daynight-size' | 'best-month' | 'best-weekday'
  icon: 'sun' | 'calendar' | 'week'
  text: string
  detail: string
}

export type PersonalInsightsResult = {
  insights: PersonalInsight[]
  totalCount: number
}

// Convention explicite (assumée dans le texte) : journée = 7h–21h heure de Paris.
const DAY_START_HOUR = 7
const DAY_END_HOUR = 21 // exclusif

const MIN_DAYNIGHT_PER_BUCKET = 4 // prises avec taille, par créneau
const MIN_DELTA_PCT = 5
const MIN_FOR_MONTH = 8
const MIN_FOR_WEEKDAY = 10

type CatchLite = {
  size_cm: number | null
  caught_at: string
}

function parisParts(iso: string): { hour: number; monthKey: string; monthLabel: string; weekday: number; weekdayLabel: string } {
  const d = new Date(iso)
  const hour = parseInt(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(d),
    10,
  ) % 24
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'long' }).format(d)
  const monthNum = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', month: '2-digit' }).format(d)
  const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(d)
  const weekdayLabel = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' }).format(d)
  const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    hour,
    monthKey: monthNum,
    monthLabel,
    weekday: WD[weekdayShort] ?? 0,
    weekdayLabel,
  }
}

function isDaytime(hour: number): boolean {
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// ─── Calculs (purs, testables) ────────────────────────────────────────────────

export function computeInsights(catches: CatchLite[]): PersonalInsightsResult {
  const insights: PersonalInsight[] = []
  const totalCount = catches.length

  // 1) Taille moyenne jour vs nuit
  const daySizes: number[] = []
  const nightSizes: number[] = []
  for (const c of catches) {
    if (c.size_cm == null || c.size_cm <= 0) continue
    const { hour } = parisParts(c.caught_at)
    ;(isDaytime(hour) ? daySizes : nightSizes).push(c.size_cm)
  }
  if (daySizes.length >= MIN_DAYNIGHT_PER_BUCKET && nightSizes.length >= MIN_DAYNIGHT_PER_BUCKET) {
    const dayAvg = avg(daySizes)
    const nightAvg = avg(nightSizes)
    const ref = Math.min(dayAvg, nightAvg)
    const deltaPct = ref > 0 ? Math.round((Math.abs(dayAvg - nightAvg) / ref) * 100) : 0
    if (deltaPct >= MIN_DELTA_PCT) {
      const dayBigger = dayAvg > nightAvg
      insights.push({
        id: 'daynight-size',
        icon: 'sun',
        text: dayBigger
          ? `Tes prises en journée (7h–21h) sont en moyenne +${deltaPct}% plus grosses qu'à la nuit.`
          : `Tes prises de nuit sont en moyenne +${deltaPct}% plus grosses qu'en journée (7h–21h).`,
        detail: `⌀ ${dayAvg.toFixed(0)} cm le jour (${daySizes.length}) · ⌀ ${nightAvg.toFixed(0)} cm la nuit (${nightSizes.length})`,
      })
    }
  }

  // 2) Meilleur mois (en nombre de prises)
  if (totalCount >= MIN_FOR_MONTH) {
    const byMonth = new Map<string, { count: number; label: string }>()
    for (const c of catches) {
      const { monthKey, monthLabel } = parisParts(c.caught_at)
      const cur = byMonth.get(monthKey) ?? { count: 0, label: monthLabel }
      cur.count += 1
      byMonth.set(monthKey, cur)
    }
    const top = [...byMonth.values()].sort((a, b) => b.count - a.count)[0]
    if (top && top.count >= 3) {
      insights.push({
        id: 'best-month',
        icon: 'calendar',
        text: `${cap(top.label)} est ton meilleur mois : ${top.count} prise${top.count > 1 ? 's' : ''}.`,
        detail: `Sur ${totalCount} prises loguées`,
      })
    }
  }

  // 3) Meilleur jour de la semaine (si un jour se détache nettement)
  if (totalCount >= MIN_FOR_WEEKDAY) {
    const byWeekday = new Map<number, { count: number; label: string }>()
    for (const c of catches) {
      const { weekday, weekdayLabel } = parisParts(c.caught_at)
      const cur = byWeekday.get(weekday) ?? { count: 0, label: weekdayLabel }
      cur.count += 1
      byWeekday.set(weekday, cur)
    }
    const sorted = [...byWeekday.values()].sort((a, b) => b.count - a.count)
    const top = sorted[0]
    const second = sorted[1]
    // « se détache » = au moins 50% de prises de plus que le 2e jour
    if (top && top.count >= 4 && (!second || top.count >= second.count * 1.5)) {
      insights.push({
        id: 'best-weekday',
        icon: 'week',
        text: `Le ${top.label} est ton jour : ${top.count} prise${top.count > 1 ? 's' : ''}.`,
        detail: `Ton jour de sortie le plus productif`,
      })
    }
  }

  return { insights, totalCount }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getMyCatchInsights(): Promise<PersonalInsightsResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { insights: [], totalCount: 0 }

  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('size_cm, caught_at')
    .eq('user_id', user.id)
    .limit(2000)

  if (error || !data) return { insights: [], totalCount: 0 }
  return computeInsights(data as CatchLite[])
}
