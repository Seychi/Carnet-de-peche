import SunCalc from 'suncalc'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types'

// ─── Défis SOLO (Sprint 63) — orchestration TS ──────────────────────────────────
//
// À NE PAS confondre avec `challenges.ts` = défis CONSERVATION (rappels TS, 0 XP, cf D-F4).
// Ici : les défis DB-backed (migration 100) qui créditent de l'XP. Deux voies de calcul :
//   • SQL (RPC definer `recompute_my_challenges`) : 3 espèces/mois, prise mesurée, sortie
//     loguée, saison du bar. Idempotent, crédite reward_xp via award_xp.
//   • TS (ici) : « lever du soleil ». Aucune heure solaire n'est stockée (conditions jsonb =
//     météo + marée seulement ; suncalc vit en TS). On l'évalue sur les prises PROPRES du
//     pêcheur (anti-triche = logique SERVEUR sur de vraies prises, jamais un arg client), et
//     on persiste via service_role (award_xp = service_role only ; table sans policy d'écriture).
//
// Tout est best-effort : jamais de throw qui casserait le log de prise/sortie.

type Client = SupabaseClient<Database>

// Fenêtre « lever du soleil » : de 1 h avant à 2 h après le sunrise local (le coup du bord
// de l'aube dure au-delà de l'instant précis du lever). Constantes pour la testabilité.
const SUNRISE_BEFORE_MIN = 60
const SUNRISE_AFTER_MIN = 120

export type ChallengeScope = 'monthly' | 'once' | 'seasonal'

/** Défi + progression du pêcheur courant, prêt pour le board (cockpit /home). */
export type ChallengeBoardItem = {
  slug: string
  title: string
  description: string
  icon: string | null
  scope: ChallengeScope
  rewardXp: number
  progress: number
  target: number
  completed: boolean
  /** Fin de période (défis saisonniers), ISO date ou null. */
  periodEnd: string | null
  /** Événement saisonnier : meilleure valeur perso de la saison (ex. plus gros bar en cm). */
  bestValue?: number | null
}

/** Défi fraîchement complété (pour la célébration au log + la notif). */
export type CompletedChallenge = { slug: string; title: string; rewardXp: number }

/**
 * Qualifie une prise « au lever du soleil » : capturée dans [sunrise - 60 min, sunrise + 120 min]
 * au lieu de la prise. Pure et testable (suncalc calcule le lever du JOUR de `caughtAtIso` au
 * point donné). Renvoie false si la date/les coords sont invalides ou le lever indéfini.
 */
export function isNearSunrise(
  caughtAtIso: string,
  lat: number,
  lng: number,
  beforeMin = SUNRISE_BEFORE_MIN,
  afterMin = SUNRISE_AFTER_MIN,
): boolean {
  const t = new Date(caughtAtIso)
  if (!Number.isFinite(t.getTime())) return false
  const sr = SunCalc.getTimes(t, lat, lng).sunrise
  if (!sr || !Number.isFinite(sr.getTime())) return false
  const deltaMin = (t.getTime() - sr.getTime()) / 60000
  return deltaMin >= -beforeMin && deltaMin <= afterMin
}

/**
 * Recalcule TOUS les défis solo du pêcheur (SQL + lever du soleil) et renvoie ceux qui
 * viennent d'être complétés (completed_at ≥ sinceIso) pour la célébration/notif. Best-effort
 * intégral : chaque étape est isolée, la fonction ne throw jamais.
 */
export async function recomputeSoloChallenges(opts: {
  supabase: Client
  userId: string
  /** created_at de l'événement déclencheur (prise/sortie) — sert à repérer les complétions fraîches. */
  sinceIso?: string | null
}): Promise<{ newlyCompleted: CompletedChallenge[] }> {
  const { supabase, userId, sinceIso } = opts

  // 1. Défis SQL-calculables (RPC definer, auth.uid()). Idempotent côté SQL.
  try {
    await supabase.rpc('recompute_my_challenges')
  } catch (e) {
    console.error('[challenges-solo] recompute_my_challenges (non bloquant) :', e)
  }

  // 2. Défi « lever du soleil » (calcul TS, écriture service_role).
  try {
    await recomputeSunriseChallenge(supabase, userId)
  } catch (e) {
    console.error('[challenges-solo] sunrise (non bloquant) :', e)
  }

  // 3. Défis fraîchement complétés → célébration + notif dopamine.
  if (!sinceIso) return { newlyCompleted: [] }
  try {
    const { data } = await supabase
      .from('user_challenge_progress')
      .select('completed_at, challenge:challenges(slug, title, reward_xp)')
      .eq('user_id', userId)
      .gte('completed_at', sinceIso)

    const newlyCompleted: CompletedChallenge[] = []
    for (const row of data ?? []) {
      // L'embed FK renvoie un objet (many-to-one) ; on reste défensif.
      const ch = (row as { challenge: unknown }).challenge as
        | { slug: string; title: string; reward_xp: number }
        | { slug: string; title: string; reward_xp: number }[]
        | null
      const def = Array.isArray(ch) ? ch[0] : ch
      if (!def) continue
      newlyCompleted.push({ slug: def.slug, title: def.title, rewardXp: def.reward_xp })
    }
    return { newlyCompleted }
  } catch (e) {
    console.error('[challenges-solo] lecture newly-completed (non bloquant) :', e)
    return { newlyCompleted: [] }
  }
}

/**
 * Évalue le défi « lever du soleil » sur les prises PROPRES (coords + date via
 * catches_for_viewer, own = précis) et persiste en service_role. Crédit XP idempotent
 * (ref = challenge_id ; award_xp dédoublonne). Ne re-crédite jamais un défi déjà complété.
 */
async function recomputeSunriseChallenge(supabase: Client, userId: string): Promise<void> {
  const { data: ch } = await supabase
    .from('challenges')
    .select('id, reward_xp')
    .eq('slug', 'sunrise_catch')
    .eq('active', true)
    .maybeSingle()
  if (!ch) return

  const { data: catches } = await supabase
    .from('catches_for_viewer')
    .select('caught_at, lat, lng')
    .eq('user_id', userId)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('caught_at', 'is', null)
    .limit(2000)

  const qualifies = (catches ?? []).some((c) => {
    const caughtAt = c.caught_at as string | null
    const lat = c.lat as number | null
    const lng = c.lng as number | null
    return caughtAt != null && lat != null && lng != null && isNearSunrise(caughtAt, lat, lng)
  })

  // Écriture privilégiée : award_xp = service_role only, et la table n'a pas de policy
  // d'écriture (own-only en SELECT). L'import dynamique isole 'server-only'/clé absente.
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('user_challenge_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('challenge_id', ch.id)
    .maybeSingle()
  const alreadyCompleted = existing?.completed_at != null

  const completedAt = qualifies
    ? existing?.completed_at ?? new Date().toISOString()
    : null

  await admin.from('user_challenge_progress').upsert(
    {
      user_id: userId,
      challenge_id: ch.id,
      progress: qualifies ? 1 : 0,
      target: 1,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,challenge_id' },
  )

  if (qualifies && !alreadyCompleted && ch.reward_xp > 0) {
    await admin.rpc('award_xp', {
      p_user_id: userId,
      p_kind: 'challenge',
      p_points: ch.reward_xp,
      p_ref_type: 'challenge',
      p_ref_id: ch.id,
    })
  }
}

/**
 * Board des défis solo du pêcheur courant (cockpit /home). Rafraîchit la progression SQL au
 * passage (idempotent) puis lit défs + progression. Le « lever du soleil » se rafraîchit au
 * log de prise (coûteux) ; ici on lit l'état persisté. Best-effort : [] si non connecté/erreur.
 */
export async function getMySoloChallenges(client?: Client): Promise<ChallengeBoardItem[]> {
  const supabase = client ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  try {
    await supabase.rpc('recompute_my_challenges')
  } catch (e) {
    console.error('[challenges-solo] recompute (board, non bloquant) :', e)
  }

  const [{ data: defs }, { data: progress }] = await Promise.all([
    supabase
      .from('challenges')
      .select('id, slug, title, description, icon, scope, criteria, reward_xp, period_start, period_end, sort_order')
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('user_challenge_progress')
      .select('challenge_id, progress, target, completed_at')
      .eq('user_id', user.id),
  ])

  const byId = new Map((progress ?? []).map((p) => [p.challenge_id, p]))

  const items: ChallengeBoardItem[] = (defs ?? []).map((d) => {
    const p = byId.get(d.id)
    const criteria = (d.criteria ?? {}) as { count?: number; type?: string; species?: string }
    const fallbackTarget = Math.max(1, Number(criteria.count ?? 1))
    return {
      slug: d.slug,
      title: d.title,
      description: d.description,
      icon: d.icon,
      scope: d.scope as ChallengeScope,
      rewardXp: d.reward_xp,
      progress: p?.progress ?? 0,
      target: p?.target ?? fallbackTarget,
      completed: p?.completed_at != null,
      periodEnd: d.period_end,
      bestValue: null,
    }
  })

  // Événement saisonnier « ton plus gros … » : on annexe la meilleure valeur perso de la
  // saison (taille, cm) — honnête (tes prises), solo (aucune comparaison inter-pêcheurs).
  await annotateSeasonalBest(supabase, user.id, defs ?? [], items)

  return items
}

/**
 * Renseigne `bestValue` (plus grande taille cm) pour chaque défi saisonnier `species_in_season`,
 * sur la période. Best-effort ; une lecture en échec laisse simplement bestValue à null.
 */
async function annotateSeasonalBest(
  supabase: Client,
  userId: string,
  defs: Array<{
    slug: string
    scope: string
    criteria: unknown
    period_start: string | null
    period_end: string | null
  }>,
  items: ChallengeBoardItem[],
): Promise<void> {
  for (const d of defs) {
    if (d.scope !== 'seasonal') continue
    const criteria = (d.criteria ?? {}) as { type?: string; species?: string }
    if (criteria.type !== 'species_in_season' || !criteria.species) continue
    try {
      let q = supabase
        .from('catches_for_viewer')
        .select('size_cm')
        .eq('user_id', userId)
        .eq('species', criteria.species)
        .not('size_cm', 'is', null)
        .order('size_cm', { ascending: false })
        .limit(1)
      if (d.period_start) q = q.gte('caught_at', d.period_start)
      if (d.period_end) q = q.lte('caught_at', `${d.period_end}T23:59:59`)
      const { data } = await q.maybeSingle()
      const best = (data?.size_cm as number | null | undefined) ?? null
      const item = items.find((it) => it.slug === d.slug)
      if (item) item.bestValue = best
    } catch (e) {
      console.error('[challenges-solo] seasonal best (non bloquant) :', e)
    }
  }
}
