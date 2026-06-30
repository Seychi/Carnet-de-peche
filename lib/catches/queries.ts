import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types'
import type { CatchFilters } from './schema'

export type CatchRow = Database['public']['Views']['catches_for_viewer']['Row']

export type MyCatchStats = {
  totalCount: number
  thisMonthCount: number
  biggestCatch: { species: string; size_cm: number } | null
  favoriteSpecies: string | null
  /** Pourcentage 0-100 (déjà multiplié par 100 par la RPC). Ne PAS remultiplier à l'affichage. */
  releasedRate: number
}

export async function getMyCatches(
  filters: CatchFilters
): Promise<{ catches: CatchRow[]; totalCount: number }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  let query = supabase
    .from('catches_for_viewer')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('caught_at', { ascending: false })

  if (filters.species?.length) {
    query = query.in('species', filters.species)
  }
  if (filters.technique?.length) {
    query = query.in('technique', filters.technique)
  }
  if (filters.dateFrom) {
    query = query.gte('caught_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('caught_at', filters.dateTo)
  }
  if (filters.released !== undefined) {
    query = query.eq('released', filters.released)
  }

  const { data, count, error } = await query.range(
    filters.offset,
    filters.offset + filters.limit - 1
  )
  if (error) throw error

  return { catches: data ?? [], totalCount: count ?? 0 }
}

export async function getCatchById(id: string): Promise<CatchRow | null> {
  // Un id non-uuid ferait rejeter PostgREST (22P02) → throw → 500 au lieu d'un 404.
  // On valide en amont : un id invalide se comporte comme « introuvable » (les
  // call-sites font notFound() sur null).
  if (!z.string().uuid().safeParse(id).success) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getMyCatchStats(): Promise<MyCatchStats> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_my_catch_stats')

  if (error) throw error
  if (!data) throw new Error('Aucune donnée retournée par get_my_catch_stats')
  return data as MyCatchStats
}

// ─── getMyRecordsBySpecies ────────────────────────────────────────────────────

/** Record perso pour une espèce. Privé (scopé serveur via RLS auth.uid()). */
export type SpeciesRecord = {
  species: string
  /** Plus grande taille loguée (cm), tous champs taille confondus. */
  maxSizeCm: number
  /** Plus grand poids logué (g), si renseigné. */
  maxWeightG: number | null
}

/**
 * Le record (taille max) de chaque espèce pêchée, app-side (décision John D1 : pas
 * de RPC, 0 migration). On lit les prises depuis `catches_for_viewer` (déjà scopée
 * `auth.uid()` par la RLS) et on réduit en JS. DESCRIPTIF et PRIVÉ : zéro classement
 * inter-pêcheurs, c'est le record du pêcheur sur SON carnet.
 *
 * `size_cm` est la taille de référence ; `measured_length_cm` (prise mesurée à l'objet
 * de référence) est prise en compte quand elle dépasse `size_cm`. Une espèce sans
 * aucune taille loguée n'apparaît pas.
 */
export async function getMyRecordsBySpecies(): Promise<SpeciesRecord[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data, error } = await supabase
    .from('catches_for_viewer')
    .select('species, size_cm, measured_length_cm, weight_g')
    .eq('user_id', user.id)

  if (error) throw error

  const bySpecies = new Map<string, SpeciesRecord>()

  for (const row of data ?? []) {
    if (!row.species) continue
    const size = Math.max(row.size_cm ?? 0, row.measured_length_cm ?? 0)
    if (size <= 0) continue // pas de taille loguée pour cette prise

    const current = bySpecies.get(row.species)
    if (!current) {
      bySpecies.set(row.species, {
        species: row.species,
        maxSizeCm: size,
        maxWeightG: row.weight_g ?? null,
      })
      continue
    }
    if (size > current.maxSizeCm) current.maxSizeCm = size
    if (row.weight_g != null && (current.maxWeightG == null || row.weight_g > current.maxWeightG)) {
      current.maxWeightG = row.weight_g
    }
  }

  // Tri par taille décroissante : le plus beau poisson en premier.
  return [...bySpecies.values()].sort((a, b) => b.maxSizeCm - a.maxSizeCm)
}

// ─── getMyCatchesBreakdown ────────────────────────────────────────────────────

export type CatchBreakdown = {
  bySpecies: { species: string; count: number; avgSize: number | null }[] | null
  byTechnique: { technique: string; count: number }[] | null
  byMonth: { month: string; count: number }[] | null
}

export async function getMyCatchesBreakdown(): Promise<CatchBreakdown> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_my_catches_breakdown')
  if (error) throw error
  return (data ?? { bySpecies: null, byTechnique: null, byMonth: null }) as CatchBreakdown
}

// ─── getPhotoSignedUrl ────────────────────────────────────────────────────────

export async function getPhotoSignedUrl(
  photoPath: string,
  expiresInSec = 3600
): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('catches')
    .createSignedUrl(photoPath, expiresInSec)

  if (error) return null
  return data.signedUrl
}
