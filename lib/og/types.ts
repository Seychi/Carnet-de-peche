// ─── Types de payload des cartes de partage (OG edge) ─────────────────────────
// DÉCOUPLAGE VOLONTAIRE (garde-fou edge, sprint 38 WS B) : ces types sont définis
// ICI, en local, et NE sont PAS importés depuis `app/actions/share.ts` (qui est
// `'use server'` et tire du code server-only). La route `app/og/card/[slug]`
// tourne en `runtime = 'edge'` : elle ne lit QUE la table `shared_cards` par slug
// via un client anon, et narrowe le payload sur `payload.kind`. Si la forme de
// payload change côté WS A, mettre à jour ces types miroirs (ils sont volontairement
// permissifs : tout champ peut être absent/null car le JSON vient de la base).
//
// AUCUNE clé de coordonnée ici (anti spot-burning) : le lieu = `location_label` +
// `department` (texte). C'est garanti côté écriture (server action), et on ne rend
// de toute façon jamais autre chose qu'un libellé + un département.

export type OgTideState = 'rising' | 'falling' | 'slack' | null

export type OgCatchConditions = {
  tide_state?: OgTideState
  tide_range_m?: number | null
  wind_speed_kmh?: number | null
  water_temperature_c?: number | null
}

export type OgCatchPayload = {
  kind: 'catch'
  catch_id?: string
  species?: string | null
  size_cm?: number | null
  weight_g?: number | null
  caught_at?: string | null
  location_label?: string | null
  department?: string | null
  gear_label?: string | null
  conditions?: OgCatchConditions | null
  is_personal_best?: boolean
}

export type OgConditionsTendency = {
  factor?: string
  label?: string | null
  share?: number | null
  confidence?: 'low' | 'medium' | 'high'
}

export type OgConditionsPayload = {
  kind: 'conditions'
  sampleCount?: number
  tendencies?: OgConditionsTendency[]
  generatedFor?: string // 'YYYY-MM'
}

export type OgOutingBestCatch = {
  species?: string | null
  size_cm?: number | null
}

export type OgOutingPayload = {
  kind: 'outing'
  outing_id?: string
  started_at?: string
  ended_at?: string | null
  department?: string
  catchCount?: number
  bestCatch?: OgOutingBestCatch | null
  species?: string[]
  blank?: boolean
}

export type OgCardPayload = OgCatchPayload | OgConditionsPayload | OgOutingPayload
