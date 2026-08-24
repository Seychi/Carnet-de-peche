import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchSpotForecastWeekBatch } from '@/lib/conditions/spot-forecast'
import { computeWeeklyForecast } from '@/lib/solunar/index'
import { getNextBestWindow, findCurrentWindow } from '@/lib/solunar/next-window'

// ─── Types ────────────────────────────────────────────────────────────────────

type SpotCoord = { id: string; lng: number; lat: number }

export type SpotScoresJobResult = {
  total: number
  succeeded: number
  failed: number
  /**
   * Spots dont Open-Meteo n'a rien renvoyé (429 « Too many concurrent requests »
   * en pratique) et dont le score n'a donc PAS été réécrit. Sprint 89 : ils étaient
   * auparavant comptés en `succeeded`, ce qui rendait le job structurellement
   * aveugle à son propre mode de panne le plus fréquent.
   */
  degraded: number
  elapsedMs: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ★ Sprint 89 — ce nombre ne gouverne PLUS d'appels HTTP, seulement des upserts.
//
// Avant, il gouvernait les deux à la fois : chaque spot déclenchait ses 2 appels
// Open-Meteo, donc un lot de 10 lançait 20 requêtes simultanées et l'API répondait
// « Too many concurrent requests » en rafale. La météo est désormais récupérée en
// une campagne groupée AVANT cette boucle (`fetchSpotForecastWeekBatch`), qui fait
// 10 requêtes au total pour 212 spots au lieu de 424.
//
// Il ne reste ici que du calcul local (solunaire) et des upserts Supabase, qui
// n'ont jamais posé de problème de débit. 10 est confortable pour Postgres.
const UPSERT_CONCURRENCY = 10
// Le cron tourne 1×/jour : la validité doit couvrir tout l'intervalle entre deux
// runs + une marge, sinon les markers carte redeviennent gris quelques heures après
// le calcul. 26h = 24h + marge.
// (Le « plan Hobby Vercel » invoqué ici auparavant était faux : le projet est en
// plan pro, la fréquence du cron est libre. Cf le commentaire de la route.)
const VALIDITY_MS = 93_600_000 // 26h

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
  let degraded = 0

  // ★ Sprint 89 — UNE campagne d'appels groupés pour tout le catalogue, au lieu de
  // deux appels par spot.
  //
  // Mesure du run du 24/08 à 05:00 UTC, avec le jitter de réessai déjà déployé :
  // « 212 spots (57 ok, 155 sans données, 0 échec) in 8730ms », et 57 lignes encore
  // valides sur 217 en base. Soit 74 % de la carte sans couleur. Le grain du
  // problème n'était pas le parallélisme mais le NOMBRE de requêtes : 424 par run
  // contre 10 aujourd'hui. Le détail de la démonstration est dans
  // `lib/conditions/spot-forecast.ts`, au-dessus de `fetchSpotForecastWeekBatch`.
  //
  // Cet appel ne lève pas sur un 429 : `fetchOpenMeteo` signale puis renvoie null,
  // et les points concernés reviennent marqués `degraded`, traités juste en dessous.
  const weeks = await fetchSpotForecastWeekBatch(
    spots.map((s) => ({ lat: s.lat, lng: s.lng }))
  )

  const jobs = spots.map((spot, i) => ({ spot, forecasts: weeks[i] }))

  for (const batch of chunk(jobs, UPSERT_CONCURRENCY)) {
    await Promise.all(
      batch.map(async ({ spot, forecasts }) => {
        try {
          // ★ Sprint 89 — ne JAMAIS écraser un score valide par un score fabriqué.
          //
          // Quand Open-Meteo répond 429, `fetchOpenMeteo` renvoie null sans lever et
          // la semaine retombe sur `buildEmptyConditions`, marquée `degraded`. Le job
          // calculait alors un score sur les seuls termes qui n'ont pas besoin de la
          // mer (le solunaire), l'upsertait pour 26 h, et comptait le spot en « ok ».
          //
          // ⚠️ Le piège est là : la valeur produite n'est PAS visiblement fausse.
          // Mesuré en base sur le run du 19/08 — 81 des 208 lignes portent
          // EXACTEMENT `day_score = 64`, `current_score = 64`, `current_quality =
          // 'bonne'`, et zéro ligne 'faible' dans toute la table. Un score identique
          // en Méditerranée et sur l'estran charentais est physiquement impossible
          // avec de la marée réelle : c'est la signature du chemin dégradé
          // (`scoreTide` → NO_DATA_SCORE 0.35, vent → UNKNOWN_SCORE 0.7).
          //
          // Autrement dit, 39 % de la carte annonçait « bonne » sur des données
          // absentes, de façon parfaitement crédible à l'œil. Un 0 se serait vu.
          //
          // On préfère laisser le score de la veille vivre jusqu'à son `valid_until`,
          // et à défaut un marqueur neutre. « Je ne sais pas » est une information
          // honnête ; un 64 fabriqué est une information fausse.
          //
          // Requête de détection à rejouer : `select day_score, count(*) from
          // spot_scores where computed_at >= <run> group by 1 having count(*) > 20;`
          // `forecasts` peut être absent si la campagne groupée a rendu moins
          // d'entrées que de spots : on s'abstient plutôt que de deviner.
          if (!forecasts || forecasts.some((f) => f.degraded)) {
            degraded++
            return
          }

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
    `Spot scores computed: ${spots.length} spots (${succeeded} ok, ${degraded} sans données, ` +
      `${failed} échec) in ${elapsedMs}ms`
  )
  // Un run où la donnée manque pour plus d'un spot sur dix n'est pas un run réussi :
  // il faut que ça se voie dans les logs sans avoir à les lire ligne à ligne.
  if (degraded > spots.length / 10) {
    console.error(
      `[spot-scores] ${degraded}/${spots.length} spots sans données Open-Meteo ` +
        `(429 ?). Les scores de la veille ont été conservés.`
    )
  }

  return { total: spots.length, succeeded, failed, degraded, elapsedMs }
}
