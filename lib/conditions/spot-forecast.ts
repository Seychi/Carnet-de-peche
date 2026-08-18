import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import * as Sentry from '@sentry/nextjs'
import { createAnonClient } from '@/lib/supabase/anon'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TidePoint = {
  hour: number
  height_m: number
}

export type TideExtremum = {
  type: 'high' | 'low'
  hour: number
  height_m: number
}

export type SpotConditions = {
  fetched_at: string
  date: string
  /**
   * true = au moins un des deux appels Open-Meteo (marine, forecast) n'a pas
   * repondu, donc ce payload est INCOMPLET. Il reste servi (mieux que rien) et
   * mis en cache, mais il n'est garde que `DEGRADED_TTL_MS` au lieu d'une heure,
   * pour que le premier rendu qui suit le retablissement le remplace.
   * Optionnel : les payloads ecrits avant l'incident du 17/08 ne le portent pas.
   */
  degraded?: boolean
  /**
   * true = la courbe de maree ne vient pas de l'appel courant mais d'un releve
   * ANTERIEUR DU MEME JOUR, rejoue parce que l'API marine n'a pas repondu.
   * Sert au diagnostic : cette colonne se lit en SQL, c'est exactement comme ca
   * que l'incident du 17/08 a fini par etre compris.
   */
  tide_from_earlier_today?: boolean
  tide: {
    points: TidePoint[]
    extrema: TideExtremum[]
    current_height_m: number | null
  }
  weather: {
    code: number | null
    air_temp_c: number | null
    min_temp_c: number | null
    max_temp_c: number | null
    wind_speed_kmh: number | null
    // Vent horaire (km/h) indexé par heure LOCALE 0-23 (sprint 19 / WS-B). Permet
    // d'échantillonner le vent à l'heure de chaque fenêtre de pêche au lieu d'un
    // scalaire unique (le vent de midi) propagé à toutes les fenêtres → fin du
    // « 25/25 figé ». Optionnel : un payload de cache antérieur au sprint 19 ne le
    // contient pas → le scoring retombe proprement sur le scalaire `wind_speed_kmh`.
    wind_speed_by_hour?: (number | null)[]
    wind_direction_deg: number | null
    precipitation_mm: number | null
    precipitation_probability: number | null
    pressure_hpa: number | null
    cloud_cover_pct: number | null
    humidity_pct: number | null
    sunrise: string | null
    sunset: string | null
  }
  waves: {
    height_m: number | null
    direction_deg: number | null
    period_s: number | null
    water_temp_c: number | null
  }
  swell: {
    height_m: number | null
    period_s: number | null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getParisInfo(date?: Date): { dateStr: string; currentHourIdx: number } {
  const d = date ?? new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const year  = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const day   = parts.find(p => p.type === 'day')!.value
  const hour  = parts.find(p => p.type === 'hour')!.value
  return {
    dateStr: `${year}-${month}-${day}`,
    currentHourIdx: parseInt(hour, 10) % 24,
  }
}

function cacheKey(lat: number, lng: number, dateStr: string): string {
  return `forecast_${lat.toFixed(1)}_${lng.toFixed(1)}_${dateStr}`
}

function computeExtrema(points: TidePoint[]): TideExtremum[] {
  const extrema: TideExtremum[] = []
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].height_m
    const curr = points[i].height_m
    const next = points[i + 1].height_m
    if (curr > prev && curr > next) {
      extrema.push({ type: 'high', hour: points[i].hour, height_m: curr })
    } else if (curr < prev && curr < next) {
      extrema.push({ type: 'low', hour: points[i].hour, height_m: curr })
    }
  }
  return extrema
}

// Construit le tableau du vent horaire (km/h) indexé par heure LOCALE 0-23, à
// partir des tableaux `time`/`wind_speed_10m` d'Open-Meteo. On indexe par l'heure
// d'horloge lue dans `time` (et non par la position) : robuste aux jours de
// changement d'heure (23 ou 25 entrées), cf. piège DST Open-Meteo.
function buildWindByHour(
  times: string[] | undefined,
  winds: (number | null)[] | undefined,
  globalIndices?: number[],
): (number | null)[] {
  const out: (number | null)[] = new Array(24).fill(null)
  if (!times || !winds) return out
  const idxs = globalIndices ?? times.map((_, i) => i)
  for (const gi of idxs) {
    const t = times[gi]
    if (typeof t !== 'string' || t.length < 13) continue
    const clockHour = parseInt(t.slice(11, 13), 10) // "...T14:00" → 14
    if (Number.isFinite(clockHour) && clockHour >= 0 && clockHour < 24) {
      out[clockHour] = typeof winds[gi] === 'number' ? winds[gi] : null
    }
  }
  return out
}

// ─── Cache Supabase ───────────────────────────────────────────────────────────

// Lecture via le client ANON SANS COOKIES (sprint 84). La policy RLS SELECT de
// `weather_cache` est `using (true)` pour `anon` ET `authenticated` : la donnée lue
// est rigoureusement la même dans les deux rôles, ce cache n'a rien de personnel.
// En revanche le client de session appelait `cookies()`, ce qui rendait dynamique
// TOUTE page atteignant ce module (la home via `lib/marketing/home-data`, les
// fiches spot, le cockpit) et vidait leur `revalidate` de son sens.
// Duree de vie d'un payload COMPLET.
const FRESH_TTL_MS = 60 * 60 * 1000
// Duree de vie d'un payload INCOMPLET (`degraded`). Volontairement courte.
// Incident du 17/08 : un echec Open-Meteo etait mis en cache exactement comme une
// reussite, donc « maree indisponible » restait fige une heure sur tout le site,
// et chaque requete suivante regelait l'echec pour une heure de plus.
const DEGRADED_TTL_MS = 5 * 60 * 1000

async function readCache(key: string): Promise<SpotConditions | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('weather_cache')
    .select('payload, fetched_at')
    .eq('cache_key', key)
    .gt('fetched_at', new Date(Date.now() - FRESH_TTL_MS).toISOString())
    .maybeSingle()
  if (error || !data) return null

  const payload = data.payload as SpotConditions
  if (!isCachedPayloadUsable(payload, data.fetched_at as string)) return null
  return payload
}

/**
 * Repli de maree : si l'appel courant n'a rien ramene, on rejoue la courbe deja
 * connue. Fonction pure, exportee pour etre testee.
 *
 * Pourquoi c'est honnete, et pas du recyclage de donnee perimee : la courbe porte
 * sur UNE date, et la cle de cache contient cette date. Une courbe recuperee a 9h
 * pour le 18/08 decrit toujours le 18/08 a 17h. C'est la prevision du jour,
 * rejouee pour le meme jour.
 *
 * Ce qui n'est deliberement PAS rejoue : vagues, houle, meteo. Elles varient dans
 * la journee. Les rejouer afficherait du faux, ce qui est pire que d'afficher rien.
 */
export function mergeTideFallback(
  fresh: { points: TidePoint[]; extrema: TideExtremum[] },
  stale: { points: TidePoint[]; extrema: TideExtremum[] } | null | undefined,
): { points: TidePoint[]; extrema: TideExtremum[]; fromEarlierToday: boolean } {
  if (fresh.points.length > 0) {
    return { points: fresh.points, extrema: fresh.extrema, fromEarlierToday: false }
  }
  if (!stale || stale.points.length === 0) {
    return { points: [], extrema: [], fromEarlierToday: false }
  }
  return { points: stale.points, extrema: stale.extrema, fromEarlierToday: true }
}

/**
 * Derniere maree connue pour CETTE cle, SANS borne d'age (contrairement a
 * readCache). La cle contient la date, donc une entree trouvee ici decrit
 * forcement le meme jour. A appeler avant writeCache, qui l'ecrasera.
 */
async function readKnownTide(key: string): Promise<SpotConditions['tide'] | null> {
  try {
    const supabase = createAnonClient()
    const { data, error } = await supabase
      .from('weather_cache')
      .select('payload')
      .eq('cache_key', key)
      .maybeSingle()
    if (error || !data) return null
    const tide = (data.payload as SpotConditions)?.tide
    return tide && Array.isArray(tide.points) && tide.points.length > 0 ? tide : null
  } catch {
    return null
  }
}

/**
 * Un payload complet vaut FRESH_TTL_MS, un payload `degraded` seulement
 * DEGRADED_TTL_MS. Renvoyer false force un nouvel essai en amont ; les 5 min
 * servent d'amortisseur, sinon chaque requete rappelle une API deja en panne.
 *
 * Exportee UNIQUEMENT pour etre testable : c'est exactement cette regle qui
 * manquait le 17/08, et une regle qu'aucun test ne verifie n'est pas une regle.
 */
export function isCachedPayloadUsable(
  payload: SpotConditions | null | undefined,
  fetchedAtIso: string,
  nowMs: number = Date.now(),
): boolean {
  if (!payload) return false
  const fetchedMs = new Date(fetchedAtIso).getTime()
  if (!Number.isFinite(fetchedMs)) return false
  // Une horloge legerement en avance ne doit pas invalider une entree fraiche.
  const ageMs = Math.max(0, nowMs - fetchedMs)
  return ageMs <= (payload.degraded ? DEGRADED_TTL_MS : FRESH_TTL_MS)
}

// Écriture via service-role (weather_cache sans policy write → bypass RLS, serveur
// uniquement). onConflict:'cache_key' = PK non partielle. Best-effort : un échec ne
// casse jamais le forecast (cache opportuniste).
async function writeCache(key: string, payload: SpotConditions): Promise<void> {
  try {
    const admin = createServiceRoleClient()
    await admin.from('weather_cache').upsert(
      { cache_key: key, payload, fetched_at: new Date().toISOString() },
      { onConflict: 'cache_key' }
    )
  } catch (err) {
    console.warn('[spot-forecast] writeCache weather_cache échec (non bloquant) :', err)
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

// Lecon de l'incident du 17/08, a ne pas defaire : les quatre appels Open-Meteo
// faisaient `if (!res.ok) return null` puis `catch { return null }`. Zero log, zero
// evenement Sentry. L'API marine a cesse de repondre le 17/08 vers 21h et le site a
// servi « maree indisponible » pendant 15 h sans qu'aucune alerte ne parte : la panne
// a ete trouvee a l'oeil, sur une capture d'ecran. Le code de statut est desormais
// conserve et remonte, sans quoi on ne peut meme pas distinguer un 429 d'une panne.
const OPEN_METEO_TIMEOUT_MS = 8000

function reportOpenMeteoFailure(source: 'marine' | 'forecast', status: number, detail: string): void {
  const message = `[spot-forecast] Open-Meteo ${source} indisponible (status ${status}) : ${detail}`
  console.error(message)
  Sentry.captureMessage(message, {
    level: 'error',
    tags: { openmeteo_source: source, openmeteo_status: String(status) },
  })
}

/**
 * Next signale « cette route ne peut pas rester statique », « 404 » et « redirige »
 * en LEVANT une erreur porteuse d'un `digest`. Ce ne sont pas des pannes : ce sont
 * des signaux de controle du framework, et ils doivent traverser nos try/catch.
 *
 * Sans ce garde, le `catch` ci-dessous avalait le `DynamicServerError` de Next,
 * le comptait comme une panne reseau, REJOUAIT un fetch qui ne pouvait pas
 * reussir, et laissait la bascule statique→dynamique passer inapercue pendant
 * 22 h (issue JAVASCRIPT-NEXTJS-1P).
 *
 * Le digest est verifie dans
 * `node_modules/next/dist/client/components/hooks-server-context.js` (Next 15.5.18) :
 * `DYNAMIC_ERROR_CODE = 'DYNAMIC_SERVER_USAGE'`. On compare la chaine plutot que
 * d'importer `isDynamicServerError`, qui vit dans un chemin interne non publie et
 * casserait a la prochaine montee de version.
 *
 * Exportee UNIQUEMENT pour etre testable.
 */
export function rethrowIfNextControlFlow(err: unknown): void {
  const digest = (err as { digest?: unknown } | null | undefined)?.digest
  if (typeof digest !== 'string') return
  if (
    digest === 'DYNAMIC_SERVER_USAGE' ||
    digest === 'NEXT_NOT_FOUND' ||
    digest.startsWith('NEXT_REDIRECT')
  ) {
    throw err
  }
}

/**
 * Appel Open-Meteo avec un second essai sur les erreurs transitoires (429 et 5xx)
 * et remontee explicite de l'echec. Ne retourne null qu'apres avoir signale.
 *
 * Exportee UNIQUEMENT pour etre testable.
 */
export async function fetchOpenMeteo<T>(url: string, source: 'marine' | 'forecast'): Promise<T | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        // ★ AUCUNE option de cache ici, et surtout PAS `next: { revalidate: N }`.
        // Issue Sentry JAVASCRIPT-NEXTJS-1P : 355 evenements en 22 h, apparue avec le
        // deploiement du sprint 84 le 17/08 a 16h48, sur la page qui porte 80 % des
        // clics Google.
        //
        // Verifie dans le source installe, pas de memoire —
        // `node_modules/next/dist/server/lib/patch-fetch.js` (next 15.5.18) :
        //   • sans option de cache, `autoNoCache = true` (l.375-386), et le bailout
        //     l.480 est garde par `!autoNoCache` : la route NE bascule PAS. Le fetch
        //     n'est simplement pas mis dans le Data Cache.
        //   • avec `revalidate: 0`, `autoNoCache` est faux et `finalRevalidate === 0`
        //     declenche `markCurrentScopeAsDynamic` (l.510) : toute la fiche repasse
        //     en dynamique a chaque regeneration ISR. C'etait le bug.
        //   • avec `revalidate: 900` (la variante suggeree par le brief S88), pas de
        //     bascule, mais `revalidateStore.revalidate = 900` (l.514) ABAISSE le
        //     `revalidate` de la route entiere de 1800 a 900, en silence. Non merci.
        //   • le `signal` ci-dessous n'entre pas dans la cacheabilite : il n'est ni
        //     dans `hasUnCacheableHeader` (l.355) ni dans la cle de cache.
        //
        // La fraicheur reelle n'a de toute facon jamais dependu de Next : elle vient
        // de `weather_cache` (readCache, FRESH_TTL_MS = 1 h, plus haut dans ce fichier).
        signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
      })
      if (res.ok) return (await res.json()) as T

      // Un 4xx autre que 429 vient de NOTRE requete : la rejouer ne changera rien.
      const retryable = res.status === 429 || res.status >= 500
      if (!retryable || attempt === 2) {
        const body = await res.text().catch(() => '')
        reportOpenMeteoFailure(source, res.status, body.slice(0, 200))
        return null
      }
    } catch (err) {
      // Un signal de controle Next n'est PAS une panne Open-Meteo : le retenter est
      // inutile, et le transformer en `null` masque la regression (cf ci-dessous).
      rethrowIfNextControlFlow(err)
      if (attempt === 2) {
        reportOpenMeteoFailure(source, 0, err instanceof Error ? err.message : String(err))
        return null
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return null
}

type MarineResponse = {
  hourly: {
    time: string[]
    // sea_level_height_msl = hauteur du niveau de la mer relative au MSL → composante
    // marée (résolution horaire, modèle global gratuit). Suffit pour la courbe + PM/BM.
    sea_level_height_msl: (number | null)[]
    wave_height: (number | null)[]
    wave_direction: (number | null)[]
    wave_period: (number | null)[]
    swell_wave_height: (number | null)[]
    swell_wave_period: (number | null)[]
    sea_surface_temperature: (number | null)[]
  }
}

type ForecastHourlyResponse = {
  hourly: {
    time: string[]
    temperature_2m: (number | null)[]
    weather_code: (number | null)[]
    wind_speed_10m: (number | null)[]
    wind_direction_10m: (number | null)[]
    precipitation: (number | null)[]
    precipitation_probability: (number | null)[]
    pressure_msl: (number | null)[]
    cloud_cover: (number | null)[]
    relative_humidity_2m: (number | null)[]
  }
  daily: {
    time: string[]
    temperature_2m_max: (number | null)[]
    temperature_2m_min: (number | null)[]
    precipitation_sum: (number | null)[]
    sunrise: string[]
    sunset: string[]
  }
}

async function fetchMarineData(lat: number, lng: number, dateStr: string): Promise<MarineResponse['hourly'] | null> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=sea_level_height_msl,wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,sea_surface_temperature` +
    `&timezone=Europe%2FParis&start_date=${dateStr}&end_date=${dateStr}`
  const json = await fetchOpenMeteo<MarineResponse>(url, 'marine')
  return json?.hourly ?? null
}

async function fetchForecastData(lat: number, lng: number, dateStr: string): Promise<{ hourly: ForecastHourlyResponse['hourly']; daily: ForecastHourlyResponse['daily'] } | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation,precipitation_probability,pressure_msl,cloud_cover,relative_humidity_2m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset` +
    `&timezone=Europe%2FParis&start_date=${dateStr}&end_date=${dateStr}`
  const json = await fetchOpenMeteo<ForecastHourlyResponse>(url, 'forecast')
  return json ? { hourly: json.hourly, daily: json.daily } : null
}

// ─── Fonction principale ──────────────────────────────────────────────────────

async function _fetchSpotConditions(
  lat: number,
  lng: number,
  date?: Date
): Promise<SpotConditions> {
  const { dateStr, currentHourIdx } = getParisInfo(date)
  const key = cacheKey(lat, lng, dateStr)

  const cached = await readCache(key)
  if (cached) return cached

  const [marine, forecast] = await Promise.all([
    fetchMarineData(lat, lng, dateStr),
    fetchForecastData(lat, lng, dateStr),
  ])

  // ── Marées ──────────────────────────────────────────────────────────────────
  // sea_level_height_msl (Open-Meteo Marine) = niveau de la mer relatif au MSL,
  // indexé par heure locale (0–23). On en tire la courbe + les PM/BM (extrema).
  const tidePoints: TidePoint[] = []
  const tideLevels = marine?.sea_level_height_msl
  if (tideLevels) {
    for (let h = 0; h < tideLevels.length && h < 24; h++) {
      const v = tideLevels[h]
      if (typeof v === 'number') tidePoints.push({ hour: h, height_m: v })
    }
  }
  // Marine muette : plutot que d'afficher « Maree indisponible » sur une page qui
  // restera figee jusqu'a la prochaine revalidation, on rejoue la courbe deja
  // connue pour cette meme date. C'est le correctif de fond de l'incident du 18/08,
  // ou la home a garde un hero vide une heure a cause d'une seconde de decalage.
  const tideResult = mergeTideFallback(
    { points: tidePoints, extrema: computeExtrema(tidePoints) },
    tidePoints.length === 0 ? await readKnownTide(key) : null,
  )
  // Recalculee sur les points retenus : la hauteur « maintenant » depend de l'heure
  // courante, elle ne doit jamais etre reprise telle quelle d'un ancien payload.
  const currentTide = tideResult.points.find((p) => p.hour === currentHourIdx)?.height_m ?? null

  // ── Vagues / houle ──────────────────────────────────────────────────────────
  const waveIdx = currentHourIdx
  const waves = {
    height_m:     marine?.wave_height?.[waveIdx] ?? null,
    direction_deg: marine?.wave_direction?.[waveIdx] ?? null,
    period_s:     marine?.wave_period?.[waveIdx] ?? null,
    water_temp_c: marine?.sea_surface_temperature?.[waveIdx] ?? null,
  }
  const swell = {
    height_m: marine?.swell_wave_height?.[waveIdx] ?? null,
    period_s: marine?.swell_wave_period?.[waveIdx] ?? null,
  }

  // ── Météo horaire ────────────────────────────────────────────────────────────
  const fIdx = currentHourIdx
  const weather = {
    code:                    forecast?.hourly.weather_code?.[fIdx] ?? null,
    air_temp_c:              forecast?.hourly.temperature_2m?.[fIdx] ?? null,
    min_temp_c:              forecast?.daily.temperature_2m_min?.[0] ?? null,
    max_temp_c:              forecast?.daily.temperature_2m_max?.[0] ?? null,
    wind_speed_kmh:          forecast?.hourly.wind_speed_10m?.[fIdx] ?? null,
    wind_speed_by_hour:      buildWindByHour(forecast?.hourly.time, forecast?.hourly.wind_speed_10m),
    wind_direction_deg:      forecast?.hourly.wind_direction_10m?.[fIdx] ?? null,
    precipitation_mm:        forecast?.hourly.precipitation?.[fIdx] ?? null,
    precipitation_probability: forecast?.hourly.precipitation_probability?.[fIdx] ?? null,
    pressure_hpa:            forecast?.hourly.pressure_msl?.[fIdx] ?? null,
    cloud_cover_pct:         forecast?.hourly.cloud_cover?.[fIdx] ?? null,
    humidity_pct:            forecast?.hourly.relative_humidity_2m?.[fIdx] ?? null,
    sunrise:                 forecast?.daily.sunrise?.[0] ?? null,
    sunset:                  forecast?.daily.sunset?.[0] ?? null,
  }

  const result: SpotConditions = {
    fetched_at: new Date().toISOString(),
    date: dateStr,
    // Marque le payload incomplet pour qu'il ne soit PAS gele une heure (cf readCache).
    degraded: marine === null || forecast === null,
    tide_from_earlier_today: tideResult.fromEarlierToday,
    tide: { points: tideResult.points, extrema: tideResult.extrema, current_height_m: currentTide },
    weather,
    waves,
    swell,
  }

  await writeCache(key, result)
  return result
}

/**
 * Conditions du jour pour un point. Mémoïsé PAR REQUÊTE via React `cache()` : le
 * bandeau instruments (layout) et le cockpit /home (page) appellent le même
 * (lat, lng) au même rendu → une seule exécution (une seule lecture weather_cache,
 * et en cache froid un seul fetch Open-Meteo, pas une course). Le cache 1h
 * weather_cache reste la persistance inter-requêtes.
 */
export const fetchSpotConditions = cache(_fetchSpotConditions)

// ─── Fetch 7 jours ───────────────────────────────────────────────────────────

export type SpotForecastWeek = SpotConditions[]

async function fetchMarineDataWeek(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<MarineResponse['hourly'] | null> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=sea_level_height_msl,wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,sea_surface_temperature` +
    `&timezone=Europe%2FParis&start_date=${startDate}&end_date=${endDate}`
  const json = await fetchOpenMeteo<MarineResponse>(url, 'marine')
  return json?.hourly ?? null
}

async function fetchForecastDataWeek(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<{ hourly: ForecastHourlyResponse['hourly']; daily: ForecastHourlyResponse['daily'] } | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation,precipitation_probability,pressure_msl,cloud_cover,relative_humidity_2m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset` +
    `&timezone=Europe%2FParis&start_date=${startDate}&end_date=${endDate}`
  const json = await fetchOpenMeteo<ForecastHourlyResponse>(url, 'forecast')
  return json ? { hourly: json.hourly, daily: json.daily } : null
}

// Groupe les indices du tableau hourly.time par date locale ("2026-05-20" → [0,1,...,23])
function groupIndexByDate(times: string[]): Map<string, number[]> {
  const map = new Map<string, number[]>()
  for (let i = 0; i < times.length; i++) {
    const dateStr = times[i].split('T')[0]
    if (!map.has(dateStr)) map.set(dateStr, [])
    map.get(dateStr)!.push(i)
  }
  return map
}

function buildEmptyConditions(dateStr: string): SpotConditions {
  return {
    fetched_at: new Date().toISOString(),
    date: dateStr,
    degraded: true,
    tide: { points: [], extrema: [], current_height_m: null },
    weather: {
      code: null, air_temp_c: null, min_temp_c: null, max_temp_c: null,
      wind_speed_kmh: null, wind_speed_by_hour: new Array(24).fill(null), wind_direction_deg: null, precipitation_mm: null,
      precipitation_probability: null, pressure_hpa: null, cloud_cover_pct: null,
      humidity_pct: null, sunrise: null, sunset: null,
    },
    waves: { height_m: null, direction_deg: null, period_s: null, water_temp_c: null },
    swell: { height_m: null, period_s: null },
  }
}

function buildDayConditions(
  dateStr: string,
  dayIdx: number,
  isToday: boolean,
  currentHourIdx: number,
  marine: MarineResponse['hourly'] | null,
  forecast: { hourly: ForecastHourlyResponse['hourly']; daily: ForecastHourlyResponse['daily'] },
  hourIndices: number[]
): SpotConditions {
  // Heure de référence : heure courante pour aujourd'hui, midi pour les jours futurs
  const refLocalHour = isToday ? currentHourIdx : 12
  const refGlobalIdx = hourIndices[Math.min(refLocalHour, hourIndices.length - 1)]

  const waves = {
    height_m:      marine?.wave_height?.[refGlobalIdx] ?? null,
    direction_deg: marine?.wave_direction?.[refGlobalIdx] ?? null,
    period_s:      marine?.wave_period?.[refGlobalIdx] ?? null,
    water_temp_c:  marine?.sea_surface_temperature?.[refGlobalIdx] ?? null,
  }
  const swell = {
    height_m: marine?.swell_wave_height?.[refGlobalIdx] ?? null,
    period_s: marine?.swell_wave_period?.[refGlobalIdx] ?? null,
  }
  const weather = {
    code:                      forecast.hourly.weather_code?.[refGlobalIdx] ?? null,
    air_temp_c:                forecast.hourly.temperature_2m?.[refGlobalIdx] ?? null,
    min_temp_c:                forecast.daily.temperature_2m_min?.[dayIdx] ?? null,
    max_temp_c:                forecast.daily.temperature_2m_max?.[dayIdx] ?? null,
    wind_speed_kmh:            forecast.hourly.wind_speed_10m?.[refGlobalIdx] ?? null,
    // Vent horaire de CE jour : indexé par heure locale via les indices globaux du jour.
    wind_speed_by_hour:        buildWindByHour(forecast.hourly.time, forecast.hourly.wind_speed_10m, hourIndices),
    wind_direction_deg:        forecast.hourly.wind_direction_10m?.[refGlobalIdx] ?? null,
    precipitation_mm:          forecast.hourly.precipitation?.[refGlobalIdx] ?? null,
    precipitation_probability: forecast.hourly.precipitation_probability?.[refGlobalIdx] ?? null,
    pressure_hpa:              forecast.hourly.pressure_msl?.[refGlobalIdx] ?? null,
    cloud_cover_pct:           forecast.hourly.cloud_cover?.[refGlobalIdx] ?? null,
    humidity_pct:              forecast.hourly.relative_humidity_2m?.[refGlobalIdx] ?? null,
    sunrise:                   forecast.daily.sunrise?.[dayIdx] ?? null,
    sunset:                    forecast.daily.sunset?.[dayIdx] ?? null,
  }

  // Marées du jour depuis sea_level_height_msl, aux heures de cette date.
  const tidePoints: TidePoint[] = []
  if (marine?.sea_level_height_msl) {
    hourIndices.forEach((globalIdx, localHour) => {
      const v = marine.sea_level_height_msl[globalIdx]
      if (typeof v === 'number') tidePoints.push({ hour: localHour, height_m: v })
    })
  }
  const tideCurrent = isToday
    ? tidePoints.find((p) => p.hour === currentHourIdx)?.height_m ?? null
    : null

  return {
    fetched_at: new Date().toISOString(),
    date: dateStr,
    degraded: marine === null,
    tide: { points: tidePoints, extrema: computeExtrema(tidePoints), current_height_m: tideCurrent },
    weather,
    waves,
    swell,
  }
}

async function _fetchSpotForecastWeek(lat: number, lng: number): Promise<SpotConditions[]> {
  const { dateStr: todayStr, currentHourIdx } = getParisInfo()

  // Calculer la date de fin (aujourd'hui + 6 jours)
  const endDay = new Date()
  endDay.setDate(endDay.getDate() + 6)
  const endDateStr = getParisInfo(endDay).dateStr

  const [marine, forecast] = await Promise.all([
    fetchMarineDataWeek(lat, lng, todayStr, endDateStr),
    fetchForecastDataWeek(lat, lng, todayStr, endDateStr),
  ])

  // Fallback si Open-Meteo ne répond pas
  if (!forecast) {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return buildEmptyConditions(getParisInfo(d).dateStr)
    })
  }

  // Grouper les indices horaires par date (clé = "2026-05-20")
  const hoursByDate = groupIndexByDate(forecast.hourly.time)
  const dates = Array.from(hoursByDate.keys()).sort().slice(0, 7)

  const result: SpotConditions[] = []
  for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
    const dateStr = dates[dayIdx]
    const hourIndices = hoursByDate.get(dateStr) ?? []
    result.push(buildDayConditions(
      dateStr,
      dayIdx,
      dateStr === todayStr,
      currentHourIdx,
      marine,
      forecast,
      hourIndices,
    ))
  }

  // Compléter à 7 si l'API retourne moins (cas rares en fin de période)
  while (result.length < 7) {
    result.push(buildEmptyConditions(result[result.length - 1]?.date ?? todayStr))
  }

  return result
}

// Cache Next.js 1h — la clé inclut lat/lng automatiquement via les arguments
export const fetchSpotForecastWeek = unstable_cache(
  _fetchSpotForecastWeek,
  ['spot-forecast-week'],
  { revalidate: 3600 }
)
