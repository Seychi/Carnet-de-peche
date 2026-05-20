import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchSpotForecastWeek } from '@/lib/conditions/spot-forecast'
import { computeWeeklyForecast } from '@/lib/solunar/index'
import { getNextBestWindow, findCurrentWindow } from '@/lib/solunar/next-window'

// ─── Types ────────────────────────────────────────────────────────────────────

type SpotCoord = { id: string; lng: number; lat: number }

export type SpotScoresJobResult = {
  total: number
  succeeded: number
  failed: number
  elapsedMs: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const BATCH_SIZE = 10
const VALIDITY_MS = 3_600_000 // 1h

// ─── Job principal ──────────────────────────────────────────────────────────
// Pré-calcule le score de qualité de chaque spot public et l'upsert dans
// spot_scores. Scoring GÉNÉRIQUE (pas de multiplicateur perso). Tolérant aux
// pannes : un spot qui échoue n'interrompt pas le batch.

export async function computeAndStoreSpotScores(
  admin: SupabaseClient
): Promise<SpotScoresJobResult> {
  const started = Date.now()

  const { data, error } = await admin.rpc('get_spots_for_scoring')
  if (error) throw new Error(`get_spots_for_scoring: ${error.message}`)

  const spots = (data ?? []) as SpotCoord[]
  const today = new Date()
  let succeeded = 0
  let failed = 0

  for (const batch of chunk(spots, BATCH_SIZE)) {
    await Promise.all(
      batch.map(async (spot) => {
        try {
          const forecasts = await fetchSpotForecastWeek(spot.lat, spot.lng)
          const weekly = await computeWeeklyForecast(today, spot.lat, spot.lng, forecasts)

          const current = findCurrentWindow(weekly)
          const next = getNextBestWindow(weekly)

          const { error: upsertError } = await admin.from('spot_scores').upsert(
            {
              spot_id: spot.id,
              computed_at: new Date().toISOString(),
              valid_until: new Date(Date.now() + VALIDITY_MS).toISOString(),
              current_score: current?.score ?? 0,
              current_quality: current?.quality ?? 'faible',
              next_window_start: next?.startTimeISO ?? null,
              next_window_quality: next?.quality ?? null,
              day_score: weekly[0]?.dayScore ?? null,
            },
            { onConflict: 'spot_id' }
          )

          if (upsertError) {
            console.error(`[spot-scores] upsert ${spot.id} échoué:`, upsertError.message)
            failed++
          } else {
            succeeded++
          }
        } catch (err) {
          console.error(`[spot-scores] spot ${spot.id} échoué (non bloquant):`, err)
          failed++
        }
      })
    )
  }

  const elapsedMs = Date.now() - started
  console.log(
    `Spot scores computed: ${spots.length} spots (${succeeded} ok, ${failed} échec) in ${elapsedMs}ms`
  )

  return { total: spots.length, succeeded, failed, elapsedMs }
}
