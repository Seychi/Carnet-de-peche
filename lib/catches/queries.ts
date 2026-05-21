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
