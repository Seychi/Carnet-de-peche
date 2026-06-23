/**
 * Backfill one-shot de `tide_state` sur les prises déjà loguées (sprint 22, WS-D).
 *
 * La marée est dérivée AU LOG depuis le sprint 22 (lib/conditions/openmeteo.ts).
 * Ce script remplit rétroactivement les prises antérieures (tide_state NULL) en
 * dérivant la tendance (montante/descendante/étale) depuis Open-Meteo Marine
 * (sea_level_height_msl). Aucun coefficient SHOM inventé.
 *
 * ⚠️ NON appliqué automatiquement — John le lance :
 *      pnpm tsx scripts/backfill-tide.ts
 *    Prérequis : SUPABASE_SERVICE_ROLE_KEY dans l'env + migration 048 appliquée.
 *
 * Idempotent : ne touche que les prises à tide_state NULL. Best-effort par prise
 * (un échec réseau ou une date trop ancienne pour Open-Meteo est simplement ignoré).
 * RÉSERVE : l'API forecast/marine standard d'Open-Meteo ne couvre l'historique que
 * ~3 mois ; au-delà, tide_state restera NULL (acceptable — réservoir pré-lancement).
 */
import { createClient } from '@supabase/supabase-js'
import { tideTrendAt } from '../lib/conditions/tide'
import type { Database } from '../lib/types'

type Row = { id: string; lng: number; lat: number; caught_at: string }

function localHourParis(iso: string): number {
  return (
    parseInt(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        hour12: false,
      }).format(new Date(iso)),
      10,
    ) % 24
  )
}

async function deriveTideState(row: Row): Promise<'rising' | 'falling' | 'slack' | null> {
  const date = new Date(row.caught_at).toISOString().slice(0, 10)
  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${row.lat}&longitude=${row.lng}` +
    `&hourly=sea_level_height_msl&timezone=Europe%2FParis&start_date=${date}&end_date=${date}`

  const res = await fetch(url)
  if (!res.ok) return null
  const json = (await res.json()) as {
    hourly?: { time?: string[]; sea_level_height_msl?: (number | null)[] }
  }
  const times = json.hourly?.time ?? []
  const heights = json.hourly?.sea_level_height_msl ?? []
  const points = times
    .map((t, i) => ({ hour: parseInt(t.slice(11, 13), 10), height_m: heights[i] }))
    .filter((p): p is { hour: number; height_m: number } => Number.isFinite(p.height_m))
  if (points.length < 2) return null
  return tideTrendAt(points, localHourParis(row.caught_at))
}

async function main() {
  // Client service-role construit directement (PAS lib/supabase/service-role, qui est
  // `server-only` et casse hors d'un Server Component). Lancer avec les vars en env :
  //   dotenv -e .env.local -- pnpm tsx scripts/backfill-tide.ts   (ou export manuel)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      '[backfill-tide] NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis dans l’env.',
    )
    process.exit(1)
  }
  const admin = createClient<Database>(url, key, { auth: { persistSession: false } })
  const { data, error } = await admin.rpc('get_catches_for_tide_backfill')
  if (error) {
    console.error('[backfill-tide] RPC get_catches_for_tide_backfill échec :', error.message)
    process.exit(1)
  }
  const rows = (data ?? []) as Row[]
  console.log(`[backfill-tide] ${rows.length} prise(s) à traiter…`)

  let updated = 0
  let skipped = 0
  for (const row of rows) {
    const state = await deriveTideState(row).catch(() => null)
    if (!state) {
      skipped++
      continue
    }
    const { error: upErr } = await admin.from('catches').update({ tide_state: state }).eq('id', row.id)
    if (upErr) {
      console.error(`[backfill-tide] update ${row.id} échec :`, upErr.message)
      skipped++
    } else {
      updated++
    }
  }
  console.log(`[backfill-tide] terminé : ${updated} mise(s) à jour, ${skipped} ignorée(s).`)
}

main().catch((err) => {
  console.error('[backfill-tide] erreur fatale :', err)
  process.exit(1)
})
