import { createClient } from '@/lib/supabase/server'

// ─── Régularité personnelle (streaks) ──────────────────────────────────────────
// Descriptif et PRIVÉ : jours actifs, semaines actives, plus longue série de semaines
// consécutives. Aucune pression (« pêche demain ! ») ni comparaison. La source de
// vérité est le RPC SECURITY DEFINER get_my_streak() (056). Le calcul TS ci-dessous
// sert de repli/test et garantit la même définition.

export type Streak = {
  activeDays: number
  activeWeeks: number
  longestWeekStreak: number
}

const EMPTY: Streak = { activeDays: 0, activeWeeks: 0, longestWeekStreak: 0 }

/**
 * Streak du pêcheur courant via RPC. Best-effort : renvoie des zéros si la RPC
 * n'existe pas encore (migration 056 non appliquée) ou en cas d'erreur.
 */
export async function getMyStreak(): Promise<Streak> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_streak')
  if (error || !data) return EMPTY
  return data as unknown as Streak
}

// ─── Calcul TS (repli + test) ──────────────────────────────────────────────────

/** Numéro de semaine ISO-like : nombre de semaines depuis epoch (lundi = début). */
function weekIndex(d: Date): number {
  // Aligne sur lundi (date_trunc('week') en Postgres = lundi). Epoch = jeudi 1970-01-01.
  const ms = d.getTime()
  const dayMs = 86_400_000
  // Décalage pour que la semaine commence le lundi (1970-01-01 est un jeudi → +3 jours).
  return Math.floor((ms / dayMs + 3) / 7)
}

/** Date locale (Europe/Paris) au format YYYY-MM-DD, pour compter les jours distincts. */
function parisDayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/**
 * Calcule la régularité depuis une liste de timestamps de prises (ISO). Pur, testable.
 * Même définition que get_my_streak() : jours distincts, semaines distinctes, plus
 * longue série de semaines consécutives.
 */
export function computeStreak(caughtAtList: (string | null | undefined)[]): Streak {
  const valid = caughtAtList.filter((s): s is string => typeof s === 'string' && s.length > 0)
  if (valid.length === 0) return EMPTY

  const days = new Set(valid.map(parisDayKey))
  const weeks = Array.from(new Set(valid.map((s) => weekIndex(new Date(s))))).sort((a, b) => a - b)

  let longest = weeks.length > 0 ? 1 : 0
  let run = weeks.length > 0 ? 1 : 0
  for (let i = 1; i < weeks.length; i++) {
    run = weeks[i] === weeks[i - 1] + 1 ? run + 1 : 1
    if (run > longest) longest = run
  }

  return {
    activeDays: days.size,
    activeWeeks: weeks.length,
    longestWeekStreak: longest,
  }
}
