'use server'

import { createClient } from '@/lib/supabase/server'
import { getPersonalTendencies } from '@/lib/scoring/personal/fetch'
import { generateShareSlug } from '@/lib/share/slug'
import { isPersonalBest } from '@/lib/share/personal-best'
import {
  getMyCatchStats,
  getMyCatchesBreakdown,
  getMyRecordsBySpecies,
} from '@/lib/catches/queries'
import {
  publishSharePhoto,
  deleteSharePhoto,
  sharePhotoPathFromUrl,
} from '@/lib/storage/public-share-photo'
import type { ConditionsSnapshot } from '@/lib/conditions/openmeteo'
import type { Tendency } from '@/lib/scoring/personal/types'
import type { Json } from '@/lib/types'
import { LOOKS_LIKE_COORD } from '@/lib/cofishing/schema'
import '@/lib/zod-config'
import { z } from 'zod'

// Résultat uniformisé (même forme que app/actions/spots.ts / app/actions/gear.ts).
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour partager ta carte.'
const ID_MSG = 'Identifiant invalide.'
const SAVE_MSG = 'Impossible de générer ta carte de partage pour le moment. Réessaie.'
const NOT_MINE_MSG = "Cette prise ne t'appartient pas."
const CATCH_404_MSG = 'Prise introuvable.'
const OUTING_404_MSG = 'Sortie introuvable.'
const NOT_ENOUGH_MSG =
  'Logue au moins 3 prises pour partager tes conditions gagnantes.'
const NO_GEAR_CATCHES_MSG =
  'Rattache du matériel à tes prises pour partager ta boîte qui pêche.'

// Fenêtre de déduplication best-effort : une carte identique (même user + kind +
// même source) créée dans les dernières 24h est réutilisée plutôt que dupliquée.
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

// ─── Types de payload (PUBLICS, geom-free) ──────────────────────────────────
// Aucune clé ne porte de coordonnée : lieu = location_label + département (texte).
// Les uuid source (catchId / outingId) servent UNIQUEMENT à la déduplication ;
// ce ne sont pas des coordonnées et la carte appartient à l'user.

type CatchCardConditions = {
  tide_state: ConditionsSnapshot['tide_state']
  tide_range_m: ConditionsSnapshot['tide_range_m']
  wind_speed_kmh: number | null
  water_temperature_c: number | null
}

export type CatchCardPayload = {
  kind: 'catch'
  catch_id: string
  username?: string | null
  species: string | null
  size_cm: number | null
  weight_g: number | null
  caught_at: string | null
  location_label: string | null
  department: string | null
  gear_label: string | null
  conditions: CatchCardConditions
  is_personal_best: boolean
  // URL publique de la photo NETTOYÉE (EXIF/GPS strippé serveur via publishSharePhoto).
  // Absente/null si l'utilisateur n'a pas opt-in (includePhoto) ou si pas de photo.
  // Ce n'est PAS une coordonnée : c'est une copie re-encodée dans le bucket public.
  photo_url?: string | null
}

export type ConditionsCardPayload = {
  kind: 'conditions'
  username?: string | null
  sampleCount: number
  tendencies: Array<Pick<Tendency, 'factor' | 'label' | 'share' | 'confidence'>>
  generatedFor: string // 'YYYY-MM'
}

type OutingBestCatch = { species: string | null; size_cm: number | null }

export type OutingCardPayload = {
  kind: 'outing'
  outing_id: string
  username?: string | null
  started_at: string
  ended_at: string | null
  department: string
  catchCount: number
  bestCatch: OutingBestCatch | null
  species: string[]
  blank: boolean
}

// Un leurre qui pêche : libellé + type + nombre de prises + espèce dominante.
// PUREMENT TEXTUEL : aucune clé géo (spot_id / lat / lng / geom) et aucune URL de
// photo. Décision John D3 = on partage le NOMBRE de prises (pas un « taux de
// réussite » %, faute de dénominateur de sorties par leurre). D4 = aucune photo.
type GearboxTopGear = {
  label: string
  kind: string
  catchCount: number
  topSpecies: string | null
}

export type GearboxCardPayload = {
  kind: 'gearbox'
  username?: string | null
  topGear: GearboxTopGear[]
  totalCatchesWithGear: number
}

// ─── Wrapped (kind 'recap') ──────────────────────────────────────────────────
// Bilan annuel « à la Spotify Wrapped ». PUREMENT DESCRIPTIF et geom-free : aucune
// coordonnée, aucun spot, aucun classement inter-pêcheurs. Tout vient du carnet de
// l'utilisateur (catches_for_viewer scopé auth.uid()).
export type RecapCardPayload = {
  kind: 'recap'
  username?: string | null
  period: string // ex '2026'
  totalCount: number
  speciesCount: number
  biggest: { species: string; size_cm: number } | null
  topSpecies: string | null
  topMonth: string | null // 'YYYY-MM'
  releasedRate: number | null // 0-100
}

// ─── Records (kind 'records') ────────────────────────────────────────────────
// Le tableau des records perso (taille max par espèce). DESCRIPTIF et PRIVÉ par
// nature : c'est le record du pêcheur sur SON carnet, zéro classement inter-pêcheurs
// (anti-leaderboard). Geom-free : que des libellés d'espèces et des tailles/poids.
export type RecordsCardPayload = {
  kind: 'records'
  username?: string | null
  records: Array<{ species: string; size_cm: number; weight_g: number | null }>
}

export type ShareCardInput =
  | { kind: 'catch'; catchId: string; includePhoto?: boolean }
  | { kind: 'conditions' }
  | { kind: 'outing'; outingId: string }
  | { kind: 'gearbox' }
  | { kind: 'recap'; period?: string }
  | { kind: 'records' }

const uuid = z.string().uuid()

function monthStamp(d = new Date()): string {
  return d.toISOString().slice(0, 7) // 'YYYY-MM'
}

// Le @pseudo du partageur (profiles.username), affiché sur la carte (WS-D). Lecture
// scopée à l'appelant ; jamais une donnée géo. Null tolérant (pseudo non encore posé).
async function getUsername(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle()
  return data?.username ?? null
}

// ---------------------------------------------------------------------------
// sanitizeLocationLabel — garde-fou anti spot-burning sur le payload PUBLIC.
// `location_label` est du texte LIBRE éditable (le reverseGeocode vise la commune,
// mais l'utilisateur peut y taper un lieu-dit précis ou une coordonnée). On ne
// laisse sortir qu'une granularité sûre :
//   • toute chaîne qui ressemble à une coordonnée (même motif LOOKS_LIKE_COORD que le
//     co-pêchage : 1-2 entiers . 3+ décimales) est REJETÉE → on retombe sur null
//     (la carte montre alors le département seul) ;
//   • sinon on normalise (trim + longueur bornée). Le partage reste geom-free.
// ---------------------------------------------------------------------------
function sanitizeLocationLabel(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (LOOKS_LIKE_COORD.test(trimmed)) return null
  return trimmed.slice(0, 80)
}

// ---------------------------------------------------------------------------
// Réutilise une carte récente identique (même user + kind, et même source quand
// il y en a une) pour éviter d'empiler des doublons à chaque tap. Best-effort :
// en cas d'erreur de lecture on retombe sur une insertion neuve.
// ---------------------------------------------------------------------------
async function findRecentSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  kind: ShareCardInput['kind'],
  match?: (payload: Record<string, unknown>) => boolean,
): Promise<string | null> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
  const { data, error } = await supabase
    .from('shared_cards')
    .select('slug, payload, created_at')
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data) return null
  for (const row of data) {
    const payload = (row.payload ?? {}) as Record<string, unknown>
    if (!match || match(payload)) return row.slug
  }
  return null
}

// ---------------------------------------------------------------------------
// Insère la carte et renvoie son slug. Slug aléatoire non énumérable ; en cas de
// collision (extrêmement improbable) on retente une poignée de fois.
// ---------------------------------------------------------------------------
async function insertCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  kind: ShareCardInput['kind'],
  payload: Record<string, unknown>,
): Promise<ActionResult<{ slug: string }>> {
  // Le payload est un objet JSON sérialisable (geom-free) → cast vers Json
  // (convention repo : as unknown, cf catches/actions.ts conditions as unknown).
  const json = payload as unknown as Json
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateShareSlug()
    const { error } = await supabase
      .from('shared_cards')
      .insert({ user_id: userId, kind, slug, payload: json })
    if (!error) return ok({ slug })
    // 23505 = unique_violation sur slug → on retente avec un nouveau slug.
    if (error.code !== '23505') {
      console.error('[share/insertCard]', error.message)
      return fail(SAVE_MSG)
    }
  }
  return fail(SAVE_MSG)
}

// ───────────────────────────────────────────────────────────────────────────
// createShareCard — point d'entrée unique. Opt-in strict : l'action ne s'exécute
// que sur demande explicite de l'utilisateur, sur SA donnée. Le payload est
// PUBLIC et geom-free (anti spot-burning, invariant n°1 du sprint).
// ───────────────────────────────────────────────────────────────────────────
export async function createShareCard(
  input: ShareCardInput,
): Promise<ActionResult<{ slug: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  switch (input.kind) {
    case 'catch':
      return createCatchCard(
        supabase,
        user.id,
        input.catchId,
        input.includePhoto ?? false,
      )
    case 'conditions':
      return createConditionsCard(supabase, user.id)
    case 'outing':
      return createOutingCard(supabase, user.id, input.outingId)
    case 'gearbox':
      return createGearboxCard(supabase, user.id)
    case 'recap':
      return createRecapCard(supabase, user.id, input.period)
    case 'records':
      return createRecordsCard(supabase, user.id)
    default:
      return fail('Type de carte inconnu.')
  }
}

// ─── kind 'catch' ────────────────────────────────────────────────────────────
async function createCatchCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  catchId: string,
  includePhoto: boolean,
): Promise<ActionResult<{ slug: string }>> {
  if (!uuid.safeParse(catchId).success) return fail(ID_MSG)

  // Lecture via catches_for_viewer (JAMAIS la table) scopée auth.uid() : on ne
  // peut partager QUE sa propre prise (refus sinon).
  const { data: row, error } = await supabase
    .from('catches_for_viewer')
    .select(
      'id, user_id, species, size_cm, weight_g, caught_at, location_label, department, gear_label, tide_state, wind_speed_kmh, water_temperature_c, conditions',
    )
    .eq('id', catchId)
    .maybeSingle()

  if (error) {
    console.error('[share/createCatchCard]', error.message)
    return fail(SAVE_MSG)
  }
  if (!row) return fail(CATCH_404_MSG)
  // Garde-fou anti-usurpation : la prise doit appartenir à l'appelant.
  if (row.user_id !== userId) return fail(NOT_MINE_MSG)

  // Dédup : même prise déjà partagée récemment → on réutilise son slug (avant le
  // calcul du record perso pour éviter une requête inutile).
  const existing = await findRecentSlug(
    supabase,
    userId,
    'catch',
    (p) => p.catch_id === catchId,
  )
  if (existing) return ok({ slug: existing })

  // tide_range_m (marnage) vit dans le jsonb conditions de la prise.
  // tide_coefficient est TOUJOURS null → on ne l'inclut pas.
  const snapshot = (row.conditions ?? null) as ConditionsSnapshot | null
  const tideRangeM = snapshot?.tide_range_m ?? null

  const personalBest = await isPersonalBest(catchId, row.species, row.size_cm)

  // Photo du poisson (WS-A) : opt-in STRICT. Si l'utilisateur a coché « inclure la
  // photo » ET que la prise a bien une photo, on lit photo_path depuis la table
  // `catches` OWNER-scopée (catches_for_viewer n'expose pas photo_path ; la table
  // n'est lisible que par son propriétaire), puis publishSharePhoto copie une version
  // EXIF/GPS strippée vers le bucket PUBLIC. Le bucket privé `catches` reste intact.
  let photoUrl: string | null = null
  if (includePhoto) {
    const { data: catchRow } = await supabase
      .from('catches')
      .select('photo_path')
      .eq('id', catchId)
      .eq('user_id', userId)
      .maybeSingle()
    if (catchRow?.photo_path) {
      const published = await publishSharePhoto({
        userId,
        sourcePath: catchRow.photo_path,
      })
      photoUrl = published?.url ?? null
    }
  }

  const payload: CatchCardPayload = {
    kind: 'catch',
    catch_id: catchId,
    username: await getUsername(supabase, userId),
    species: row.species,
    size_cm: row.size_cm,
    weight_g: row.weight_g,
    caught_at: row.caught_at,
    // Sanitisé : jamais une coordonnée ni un lieu-dit arbitrairement long dans le
    // payload public (anti spot-burning). Null → la carte montre le département seul.
    location_label: sanitizeLocationLabel(row.location_label),
    // Trim du char(3) paddé ('17 ') pour ne pas stocker un département non lookup-able.
    department: row.department?.trim() ?? null,
    gear_label: row.gear_label,
    conditions: {
      tide_state: (row.tide_state as ConditionsSnapshot['tide_state']) ?? null,
      tide_range_m: tideRangeM,
      wind_speed_kmh: row.wind_speed_kmh,
      water_temperature_c: row.water_temperature_c,
    },
    is_personal_best: personalBest,
    photo_url: photoUrl,
  }

  return insertCard(supabase, userId, 'catch', payload as unknown as Record<string, unknown>)
}

// ─── kind 'conditions' ───────────────────────────────────────────────────────
async function createConditionsCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ActionResult<{ slug: string }>> {
  // Récap global (sans scope). getPersonalTendencies résout auth.uid() côté serveur
  // et lit catches_for_viewer filtrée — descriptif, jamais prédictif.
  // hasEnough = sampleCount >= seuil de déverrouillage (MIN_FOR_TENDENCIES).
  // (minToUnlock = prises RESTANTES, pas le seuil → ne pas comparer dessus.)
  const t = await getPersonalTendencies()
  if (!t.hasEnough || t.tendencies.length === 0) {
    return fail(NOT_ENOUGH_MSG)
  }

  const payload: ConditionsCardPayload = {
    kind: 'conditions',
    username: await getUsername(supabase, userId),
    sampleCount: t.sampleCount,
    tendencies: t.tendencies
      .filter((td) => td.hasData && td.label)
      .map((td) => ({
        factor: td.factor,
        label: td.label,
        share: td.share,
        confidence: td.confidence,
      })),
    generatedFor: monthStamp(),
  }

  if (payload.tendencies.length === 0) return fail(NOT_ENOUGH_MSG)

  // Dédup : une carte conditions du même mois → on réutilise son slug.
  const existing = await findRecentSlug(
    supabase,
    userId,
    'conditions',
    (p) => p.generatedFor === payload.generatedFor,
  )
  if (existing) return ok({ slug: existing })

  return insertCard(
    supabase,
    userId,
    'conditions',
    payload as unknown as Record<string, unknown>,
  )
}

// ─── kind 'outing' ───────────────────────────────────────────────────────────
async function createOutingCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  outingId: string,
): Promise<ActionResult<{ slug: string }>> {
  if (!uuid.safeParse(outingId).success) return fail(ID_MSG)

  // La sortie est strictement privée (RLS outings_select_own) : ce SELECT ne
  // renvoie QUE si elle appartient à l'appelant. Pas de geom sur outings (par
  // construction : département seulement).
  const { data: outing, error } = await supabase
    .from('outings')
    .select('id, user_id, started_at, ended_at, department')
    .eq('id', outingId)
    .maybeSingle()

  if (error) {
    console.error('[share/createOutingCard]', error.message)
    return fail(SAVE_MSG)
  }
  if (!outing) return fail(OUTING_404_MSG)
  if (outing.user_id !== userId) return fail(NOT_MINE_MSG)

  // Dédup : même sortie déjà partagée récemment → on réutilise son slug (avant
  // d'agréger les prises pour éviter des requêtes inutiles).
  const existing = await findRecentSlug(
    supabase,
    userId,
    'outing',
    (p) => p.outing_id === outingId,
  )
  if (existing) return ok({ slug: existing })

  // Prises rattachées à la sortie, lues via catches_for_viewer (JAMAIS la table).
  // La migration 063 expose outing_id sur la vue (uuid de groupage, aucun geom) →
  // une seule requête owner-scopée suffit. La vue (DEFINER) applique déjà le
  // floutage geom ; on ne lit que species/size_cm (aucune coordonnée).
  const { data: catches, error: cErr } = await supabase
    .from('catches_for_viewer')
    .select('species, size_cm')
    .eq('user_id', userId)
    .eq('outing_id', outingId)

  if (cErr) {
    console.error('[share/createOutingCard:catches]', cErr.message)
    return fail(SAVE_MSG)
  }
  const rows: Array<{ species: string | null; size_cm: number | null }> =
    catches ?? []

  // catchCount = nombre de prises rattachées à la sortie.
  const catchCount = rows.length

  // Meilleure prise = la plus grande taille (record de la sortie, pas inter-pêcheurs).
  let bestCatch: OutingBestCatch | null = null
  for (const c of rows) {
    if (c.size_cm == null) continue
    if (!bestCatch || bestCatch.size_cm == null || c.size_cm > bestCatch.size_cm) {
      bestCatch = { species: c.species, size_cm: c.size_cm }
    }
  }

  // Liste distincte des espèces capturées (ordre d'apparition, sans null).
  const species = [
    ...new Set(rows.map((c) => c.species).filter((s): s is string => !!s)),
  ]

  const payload: OutingCardPayload = {
    kind: 'outing',
    outing_id: outingId,
    username: await getUsername(supabase, userId),
    started_at: outing.started_at,
    ended_at: outing.ended_at,
    department: outing.department,
    catchCount,
    bestCatch,
    species,
    blank: catchCount === 0,
  }

  return insertCard(
    supabase,
    userId,
    'outing',
    payload as unknown as Record<string, unknown>,
  )
}

// ─── kind 'gearbox' ──────────────────────────────────────────────────────────
// Boîte à matériel partageable (sprint 46). Le payload PUBLIC est PUREMENT TEXTUEL :
// pour chaque leurre qui pêche, son libellé + son type + le nombre de prises + son
// espèce dominante. Aucune coordonnée, aucun spot, aucun geom, AUCUNE photo (les
// photos de leurres vivent dans un bucket privé et ne transitent jamais ici).
async function createGearboxCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ActionResult<{ slug: string }>> {
  // Prises de l'utilisateur rattachées à un matériel, lues via catches_for_viewer
  // (JAMAIS la table). On ne SELECT que des champs textuels (gear_id de groupage,
  // gear_label dénormalisé, species) — aucune coordonnée. Scopé auth.uid().
  const { data: catches, error } = await supabase
    .from('catches_for_viewer')
    .select('gear_id, gear_label, species')
    .eq('user_id', userId)
    .not('gear_id', 'is', null)

  if (error) {
    console.error('[share/createGearboxCard]', error.message)
    return fail(SAVE_MSG)
  }
  const rows: Array<{
    gear_id: string | null
    gear_label: string | null
    species: string | null
  }> = catches ?? []

  // totalCatchesWithGear = nombre de prises ayant un matériel rattaché.
  const totalCatchesWithGear = rows.length
  if (totalCatchesWithGear === 0) return fail(NO_GEAR_CATCHES_MSG)

  // Le type (kind : leurre / montage / appat) n'est pas exposé par la vue. On le
  // lit via gear_items (RLS owner-only → uniquement MES items). Map gear_id → kind.
  const { data: gearRows, error: gErr } = await supabase
    .from('gear_items')
    .select('id, kind')
    .eq('user_id', userId)
  if (gErr) {
    console.error('[share/createGearboxCard:gear]', gErr.message)
    return fail(SAVE_MSG)
  }
  const kindById = new Map<string, string>()
  for (const g of gearRows ?? []) {
    if (g.id) kindById.set(g.id, g.kind ?? 'leurre')
  }

  // Agrégation par gear_id : nombre de prises + comptage par espèce (→ dominante).
  type Agg = {
    label: string | null
    kind: string
    catchCount: number
    speciesCounts: Map<string, number>
  }
  const byGear = new Map<string, Agg>()
  for (const r of rows) {
    if (!r.gear_id) continue
    let agg = byGear.get(r.gear_id)
    if (!agg) {
      agg = {
        label: r.gear_label,
        kind: kindById.get(r.gear_id) ?? 'leurre',
        catchCount: 0,
        speciesCounts: new Map(),
      }
      byGear.set(r.gear_id, agg)
    }
    // Le libellé peut varier d'une prise à l'autre (édité depuis) : on garde le
    // premier non vide rencontré.
    if (!agg.label && r.gear_label) agg.label = r.gear_label
    agg.catchCount += 1
    if (r.species) {
      agg.speciesCounts.set(r.species, (agg.speciesCounts.get(r.species) ?? 0) + 1)
    }
  }

  // Espèce dominante = la plus fréquente pour ce leurre (null si aucune renseignée).
  function dominantSpecies(counts: Map<string, number>): string | null {
    let best: string | null = null
    let bestN = 0
    for (const [sp, n] of counts) {
      if (n > bestN) {
        best = sp
        bestN = n
      }
    }
    return best
  }

  const topGear: GearboxTopGear[] = [...byGear.values()]
    // Un leurre sans aucun libellé exploitable n'est pas montrable → on l'écarte.
    .filter((a) => !!a.label?.trim())
    .map((a) => ({
      label: a.label!.trim().slice(0, 80),
      kind: a.kind,
      catchCount: a.catchCount,
      topSpecies: dominantSpecies(a.speciesCounts),
    }))
    .sort((x, y) => y.catchCount - x.catchCount)
    .slice(0, 8)

  if (topGear.length === 0) return fail(NO_GEAR_CATCHES_MSG)

  const payload: GearboxCardPayload = {
    kind: 'gearbox',
    username: await getUsername(supabase, userId),
    topGear,
    totalCatchesWithGear,
  }

  // Dédup : une boîte déjà partagée récemment avec le même top → on réutilise son
  // slug (signature = libellés + comptes des leurres, dans l'ordre).
  const signature = topGear.map((g) => `${g.label}:${g.catchCount}`).join('|')
  const existing = await findRecentSlug(supabase, userId, 'gearbox', (p) => {
    const prev = (p.topGear as GearboxTopGear[] | undefined) ?? []
    return prev.map((g) => `${g.label}:${g.catchCount}`).join('|') === signature
  })
  if (existing) return ok({ slug: existing })

  return insertCard(
    supabase,
    userId,
    'gearbox',
    payload as unknown as Record<string, unknown>,
  )
}

// ─── kind 'recap' (Wrapped, WS-B) ────────────────────────────────────────────
// Bilan annuel « à la Wrapped ». PUREMENT DESCRIPTIF et GEOM-FREE : on agrège le
// carnet de l'utilisateur (catches_for_viewer scopé auth.uid(), via getMyCatchStats
// + getMyCatchesBreakdown qui résolvent auth.uid() côté serveur). Zéro coordonnée,
// zéro spot, zéro classement inter-pêcheurs.
async function createRecapCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  period?: string,
): Promise<ActionResult<{ slug: string }>> {
  // Période = année. Par défaut l'année courante. On borne à 4 chiffres pour rester
  // un libellé sûr (jamais une donnée géo).
  const resolvedPeriod = /^\d{4}$/.test(period ?? '')
    ? (period as string)
    : String(new Date().getFullYear())

  let stats: Awaited<ReturnType<typeof getMyCatchStats>>
  let breakdown: Awaited<ReturnType<typeof getMyCatchesBreakdown>>
  try {
    ;[stats, breakdown] = await Promise.all([
      getMyCatchStats(),
      getMyCatchesBreakdown(),
    ])
  } catch (e) {
    console.error('[share/createRecapCard]', (e as Error).message)
    return fail(SAVE_MSG)
  }

  if (stats.totalCount === 0) return fail(NOT_ENOUGH_MSG)

  // speciesCount = nombre d'espèces distinctes loguées (ventilation par espèce).
  const speciesCount = breakdown.bySpecies?.length ?? 0

  // topMonth = le mois le plus prolifique (max de prises), 'YYYY-MM' (null si vide).
  let topMonth: string | null = null
  let topMonthCount = 0
  for (const m of breakdown.byMonth ?? []) {
    if (m.count > topMonthCount) {
      topMonthCount = m.count
      topMonth = m.month
    }
  }

  const payload: RecapCardPayload = {
    kind: 'recap',
    username: await getUsername(supabase, userId),
    period: resolvedPeriod,
    totalCount: stats.totalCount,
    speciesCount,
    biggest: stats.biggestCatch,
    topSpecies: stats.favoriteSpecies,
    topMonth,
    releasedRate: stats.releasedRate,
  }

  // Dédup : un récap de la même période déjà partagé récemment → on réutilise son slug.
  const existing = await findRecentSlug(
    supabase,
    userId,
    'recap',
    (p) => p.period === resolvedPeriod,
  )
  if (existing) return ok({ slug: existing })

  return insertCard(
    supabase,
    userId,
    'recap',
    payload as unknown as Record<string, unknown>,
  )
}

// ─── kind 'records' (carte SÉPARÉE, WS-C, décision John D2) ───────────────────
// Le tableau des records perso (taille max par espèce, top ~8). DESCRIPTIF et PRIVÉ
// par construction : c'est le record du pêcheur sur SON carnet, zéro classement
// inter-pêcheurs (anti-leaderboard). On RÉUTILISE getMyRecordsBySpecies (déjà scopée
// auth.uid()). Geom-free : que des libellés d'espèces et des tailles/poids.
async function createRecordsCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ActionResult<{ slug: string }>> {
  let records: Awaited<ReturnType<typeof getMyRecordsBySpecies>>
  try {
    records = await getMyRecordsBySpecies()
  } catch (e) {
    console.error('[share/createRecordsCard]', (e as Error).message)
    return fail(SAVE_MSG)
  }

  // getMyRecordsBySpecies est déjà trié par taille décroissante : on garde le top 8.
  const top = records.slice(0, 8).map((r) => ({
    species: r.species,
    size_cm: r.maxSizeCm,
    weight_g: r.maxWeightG,
  }))

  if (top.length === 0) return fail(NOT_ENOUGH_MSG)

  const payload: RecordsCardPayload = {
    kind: 'records',
    username: await getUsername(supabase, userId),
    records: top,
  }

  // Dédup : un tableau de records identique déjà partagé récemment → on réutilise son
  // slug (signature = espèce+taille de chaque ligne, dans l'ordre).
  const signature = top.map((r) => `${r.species}:${r.size_cm}`).join('|')
  const existing = await findRecentSlug(supabase, userId, 'records', (p) => {
    const prev = (p.records as RecordsCardPayload['records'] | undefined) ?? []
    return prev.map((r) => `${r.species}:${r.size_cm}`).join('|') === signature
  })
  if (existing) return ok({ slug: existing })

  return insertCard(
    supabase,
    userId,
    'records',
    payload as unknown as Record<string, unknown>,
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Gestion / révocation des cartes (sprint 38 WS-C). Owner-only : la RLS
// (061) garantit DELETE/SELECT sur SES lignes uniquement, on double le filtre
// user_id côté action par défense en profondeur.
// ───────────────────────────────────────────────────────────────────────────

// Résumé léger d'une carte pour l'écran « mes cartes partagées » : kind + un
// libellé humain dérivé du payload (geom-free, déjà public). Pas de re-calcul.
export type ShareCardSummary = {
  slug: string
  kind: 'catch' | 'conditions' | 'outing' | 'gearbox' | 'recap' | 'records'
  title: string
  createdAt: string
}

function summarizePayload(
  kind: string,
  payload: Record<string, unknown>,
): string {
  if (kind === 'catch') {
    const species = typeof payload.species === 'string' ? payload.species : null
    const size = typeof payload.size_cm === 'number' ? payload.size_cm : null
    const parts = [species ?? 'Prise', size != null ? `${size} cm` : null].filter(
      Boolean,
    )
    return parts.join(' · ')
  }
  if (kind === 'conditions') {
    const month =
      typeof payload.generatedFor === 'string' ? payload.generatedFor : null
    return month ? `Mes conditions gagnantes (${month})` : 'Mes conditions gagnantes'
  }
  if (kind === 'outing') {
    const count = typeof payload.catchCount === 'number' ? payload.catchCount : 0
    return `Sortie · ${count} prise${count > 1 ? 's' : ''}`
  }
  if (kind === 'gearbox') {
    const gear = Array.isArray(payload.topGear) ? payload.topGear : []
    const n = gear.length
    return n > 0
      ? `Ma boîte · ${n} leurre${n > 1 ? 's' : ''} qui pêche${n > 1 ? 'nt' : ''}`
      : 'Ma boîte à pêche'
  }
  if (kind === 'recap') {
    const period = typeof payload.period === 'string' ? payload.period : null
    const count = typeof payload.totalCount === 'number' ? payload.totalCount : 0
    return period
      ? `Mon année ${period} · ${count} prise${count > 1 ? 's' : ''}`
      : 'Mon bilan de pêche'
  }
  if (kind === 'records') {
    const records = Array.isArray(payload.records) ? payload.records : []
    const n = records.length
    return n > 0
      ? `Mes records · ${n} espèce${n > 1 ? 's' : ''}`
      : 'Mes records de pêche'
  }
  return 'Carte partagée'
}

const KNOWN_KINDS = new Set([
  'catch',
  'conditions',
  'outing',
  'gearbox',
  'recap',
  'records',
])

// listMyShareCards — toutes MES cartes (les plus récentes d'abord) pour l'écran
// de gestion/révocation. Lecture scopée auth.uid().
export async function listMyShareCards(): Promise<
  ActionResult<ShareCardSummary[]>
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const { data, error } = await supabase
    .from('shared_cards')
    .select('slug, kind, payload, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[share/listMyShareCards]', error.message)
    return fail(SAVE_MSG)
  }

  const cards: ShareCardSummary[] = (data ?? [])
    .filter((row) => KNOWN_KINDS.has(row.kind))
    .map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>
      return {
        slug: row.slug,
        kind: row.kind as ShareCardSummary['kind'],
        title: summarizePayload(row.kind, payload),
        createdAt: row.created_at,
      }
    })

  return ok(cards)
}

// deleteShareCard — révocation d'une carte par son slug. Owner-only (RLS + filtre
// user_id explicite). Après suppression, /c/{slug} renvoie 404.
export async function deleteShareCard(
  slug: string,
): Promise<ActionResult<{ slug: string }>> {
  if (typeof slug !== 'string' || slug.length < 6 || slug.length > 64) {
    return fail(ID_MSG)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  // Avant de supprimer la ligne, on récupère le payload (owner-scopé) pour savoir si
  // une photo PUBLIQUE est rattachée : la révocation doit aussi purger le bucket
  // `share-photos` (sinon orphelin public toujours accessible par URL).
  const { data: existing } = await supabase
    .from('shared_cards')
    .select('payload')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = await supabase
    .from('shared_cards')
    .delete()
    .eq('slug', slug)
    .eq('user_id', user.id)

  if (error) {
    console.error('[share/deleteShareCard]', error.message)
    return fail(SAVE_MSG)
  }

  // Best-effort : supprime la photo publique copiée si la carte en portait une.
  const payload = (existing?.payload ?? {}) as Record<string, unknown>
  const photoUrl =
    typeof payload.photo_url === 'string' ? payload.photo_url : null
  const photoPath = sharePhotoPathFromUrl(photoUrl)
  if (photoPath) await deleteSharePhoto(photoPath)

  return ok({ slug })
}
