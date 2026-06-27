/**
 * Sprint 10 — Bloc 4 : vérification de la précision de nos marées (étalon SHOM).
 *
 * Compare les PM/BM dérivés d'Open-Meteo Marine (`sea_level_height_msl`, ce que
 * l'app affiche depuis le sprint 9.5) aux horaires officiels SHOM saisis à la
 * main dans `scripts/fixtures/shom-tides.json`.
 *
 * Deux méthodes mesurées :
 *  - "horaire"      : extremum naïf sur la grille horaire = pipeline actuel de
 *                     l'app (lib/conditions/spot-forecast.ts → computeExtrema).
 *                     Quantification ±30 min inhérente.
 *  - "interpolé"    : raffinement parabolique (3 points autour de l'extremum)
 *                     → estimation sub-horaire. Si cette méthode passe le seuil
 *                     des 15 min, elle est portable dans l'app en ~10 lignes.
 *
 * Usage :
 *   pnpm verify-tides                     → fenêtre = celle du fixture
 *   pnpm verify-tides --markdown          → sortie markdown (pour le rapport)
 *
 * Décision (docs/sprint-10/BRIEF.md Bloc 4) :
 *   médiane < 15 min partout → GO copy « horaires de marée vérifiés »
 *   sinon → pas de comm', WorldTides prioritaire au sprint 11.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type ExtremumType = 'high' | 'low'

type DerivedExtremum = {
  type: ExtremumType
  /** Minutes depuis minuit (heure locale Europe/Paris) du jour `date`. */
  minutes: number
  date: string
  height_m: number
}

type ShomEvent = { type: ExtremumType; time: string; height_m?: number }
type ShomFixture = {
  source: string
  retrieved_at: string
  /** port → date ISO → événements PM/BM officiels. */
  ports: Record<string, Record<string, ShomEvent[]>>
}

type Facade = 'manche' | 'atlantique' | 'mediterranee'

// Ports audités = ceux pour lesquels on a un étalon SHOM figé dans le fixture.
// Honnêteté : on n'audite QUE ce qu'on peut comparer à une source officielle. On
// n'invente jamais d'horaire SHOM pour gonfler la couverture.
//
// La Méditerranée est traitée à part (PORTS_NOTES) : marnage ~0,2 m, marée surtout
// météorologique (vent, pression) et non astronomique. Un extremum « astronomique »
// y a peu de sens physique → on documente la limite plutôt que d'afficher un faux
// écart. (cf docs/sprint-38/tide-calibration-results.md)
const PORTS: Record<
  string,
  { label: string; lat: number; lon: number; facade: Facade; note?: string }
> = {
  // ── Manche ──────────────────────────────────────────────────────────────────
  'saint-malo': {
    label: 'Saint-Malo',
    lat: 48.69,
    lon: -2.03,
    facade: 'manche',
    note: 'Plus grand marnage d’Europe (~12 m) : test exigeant, étalon Manche',
  },
  // ── Atlantique ──────────────────────────────────────────────────────────────
  brest: {
    label: 'Brest',
    lat: 48.3,
    lon: -4.6,
    facade: 'atlantique',
    note: 'Port de référence historique du SHOM (marégraphe de référence FR)',
  },
  pornichet: {
    label: 'Pornichet',
    lat: 47.22,
    lon: -2.38,
    facade: 'atlantique',
    note: 'Port où Fishing Grid est critiqué (~30 min d’écart, avis App Store mai 2026)',
  },
  'les-sables-dolonne': {
    label: 'Les Sables-d’Olonne',
    lat: 46.46,
    lon: -1.83,
    facade: 'atlantique',
  },
  arcachon: {
    label: 'Arcachon (Eyrac)',
    lat: 44.66,
    lon: -1.21,
    facade: 'atlantique',
    note: 'Bassin semi-fermé : zone difficile pour un modèle global, à surveiller',
  },
}

// --fixture <chemin> pour pointer une autre fenêtre (ex : shom-tides-fenetre2.json)
const fixtureArgIdx = process.argv.indexOf('--fixture')
const FIXTURE_PATH =
  fixtureArgIdx !== -1 && process.argv[fixtureArgIdx + 1]
    ? resolve(process.argv[fixtureArgIdx + 1])
    : resolve(__dirname, 'fixtures', 'shom-tides.json')
const MATCH_WINDOW_MIN = 3 * 60 // un événement SHOM doit matcher un des nôtres à ±3h

// ---------------------------------------------------------------------------
// Open-Meteo Marine
// ---------------------------------------------------------------------------
async function fetchSeaLevel(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
): Promise<{ time: string[]; sea_level_height_msl: (number | null)[] }> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&hourly=sea_level_height_msl&timezone=Europe%2FParis` +
    `&start_date=${startDate}&end_date=${endDate}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} pour ${lat},${lon}`)
  const json = (await res.json()) as {
    hourly?: { time: string[]; sea_level_height_msl: (number | null)[] }
  }
  if (!json.hourly?.sea_level_height_msl) {
    throw new Error(`Pas de sea_level_height_msl pour ${lat},${lon}`)
  }
  return json.hourly
}

// ---------------------------------------------------------------------------
// Extraction des extrema
// ---------------------------------------------------------------------------

/** Même logique que computeExtrema de lib/conditions/spot-forecast.ts : extremum
 *  local sur la grille horaire (le pipeline réellement en prod). */
function hourlyExtrema(time: string[], levels: (number | null)[]): DerivedExtremum[] {
  const out: DerivedExtremum[] = []
  for (let i = 1; i < levels.length - 1; i++) {
    const prev = levels[i - 1]
    const curr = levels[i]
    const next = levels[i + 1]
    if (prev == null || curr == null || next == null) continue
    const isHigh = curr > prev && curr >= next
    const isLow = curr < prev && curr <= next
    if (!isHigh && !isLow) continue
    const [date, hhmm] = time[i].split('T')
    const [h, m] = hhmm.split(':').map(Number)
    out.push({ type: isHigh ? 'high' : 'low', minutes: h * 60 + m, date, height_m: curr })
  }
  return out
}

/** Raffinement parabolique : ajuste une parabole sur (i-1, i, i+1) et prend son
 *  sommet → estimation sub-horaire du vrai extremum. */
function interpolatedExtrema(time: string[], levels: (number | null)[]): DerivedExtremum[] {
  const out: DerivedExtremum[] = []
  for (let i = 1; i < levels.length - 1; i++) {
    const y0 = levels[i - 1]
    const y1 = levels[i]
    const y2 = levels[i + 1]
    if (y0 == null || y1 == null || y2 == null) continue
    const isHigh = y1 > y0 && y1 >= y2
    const isLow = y1 < y0 && y1 <= y2
    if (!isHigh && !isLow) continue
    const denom = y0 - 2 * y1 + y2
    // offset du sommet en heures, borné à ±0.5 (au-delà la parabole ment)
    const offset = denom === 0 ? 0 : Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / denom))
    const heightAtVertex = y1 - ((y0 - y2) * offset) / 4
    const [date, hhmm] = time[i].split('T')
    const [h, m] = hhmm.split(':').map(Number)
    let minutes = Math.round(h * 60 + m + offset * 60)
    let d = date
    if (minutes < 0) {
      minutes += 24 * 60
      d = shiftDate(date, -1)
    } else if (minutes >= 24 * 60) {
      minutes -= 24 * 60
      d = shiftDate(date, +1)
    }
    out.push({ type: isHigh ? 'high' : 'low', minutes, date: d, height_m: heightAtVertex })
  }
  return out
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Position absolue (minutes depuis le 1er jour de la fenêtre) pour matcher
 *  proprement les événements proches de minuit. */
function absMinutes(e: { date: string; minutes: number }, day0: string): number {
  const days = Math.round(
    (Date.parse(`${e.date}T00:00:00Z`) - Date.parse(`${day0}T00:00:00Z`)) / 86_400_000,
  )
  return days * 24 * 60 + e.minutes
}

// ---------------------------------------------------------------------------
// Comparaison
// ---------------------------------------------------------------------------
type Delta = {
  date: string
  type: ExtremumType
  shom: string
  ours: string
  deltaMin: number
  /** Écart signé : positif = Open-Meteo en retard sur le SHOM. */
  signedMin: number
}

function compare(
  shomEvents: { date: string; ev: ShomEvent }[],
  derived: DerivedExtremum[],
  day0: string,
): { deltas: Delta[]; unmatched: number } {
  const deltas: Delta[] = []
  let unmatched = 0
  for (const { date, ev } of shomEvents) {
    const [h, m] = ev.time.split(':').map(Number)
    const target = absMinutes({ date, minutes: h * 60 + m }, day0)
    let best: { d: DerivedExtremum; dist: number; signed: number } | null = null
    for (const d of derived) {
      if (d.type !== ev.type) continue
      const signed = absMinutes(d, day0) - target
      const dist = Math.abs(signed)
      if (!best || dist < best.dist) best = { d, dist, signed }
    }
    if (!best || best.dist > MATCH_WINDOW_MIN) {
      unmatched++
      continue
    }
    deltas.push({
      date,
      type: ev.type,
      shom: ev.time,
      ours: fmtMinutes(best.d.minutes),
      deltaMin: best.dist,
      signedMin: best.signed,
    })
  }
  return { deltas, unmatched }
}

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function median(values: number[]): number {
  if (values.length === 0) return NaN
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const markdown = process.argv.includes('--markdown')

  let fixture: ShomFixture
  try {
    fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as ShomFixture
  } catch {
    console.error(
      `Fixture introuvable ou invalide : ${FIXTURE_PATH}\n` +
        `Saisis les horaires SHOM officiels (https://maree.shom.fr ou annuaire) au format :\n` +
        `{ "source": "...", "retrieved_at": "AAAA-MM-JJ", "ports": { "brest": { "2026-06-12": [{"type":"high","time":"03:42"}, ...] } } }`,
    )
    process.exit(1)
  }

  // Fenêtre = dates couvertes par le fixture.
  const allDates = Object.values(fixture.ports)
    .flatMap((days) => Object.keys(days))
    .sort()
  if (allDates.length === 0) {
    console.error('Le fixture ne contient aucune date.')
    process.exit(1)
  }
  const startDate = allDates[0]
  const endDate = allDates[allDates.length - 1]

  const summary: {
    port: string
    facade: Facade
    n: number
    medHourly: number
    maxHourly: number
    medInterp: number
    maxInterp: number
    medSigned: number
    medAbsResidual: number
    unmatched: number
  }[] = []
  const detailBlocks: string[] = []

  for (const [slug, port] of Object.entries(PORTS)) {
    const shomDays = fixture.ports[slug]
    if (!shomDays) {
      console.warn(`⚠ Pas de données SHOM pour ${port.label} dans le fixture — port sauté.`)
      continue
    }
    const hourly = await fetchSeaLevel(port.lat, port.lon, startDate, endDate)
    const shomEvents = Object.entries(shomDays)
      .flatMap(([date, evs]) => evs.map((ev) => ({ date, ev })))
      .sort((a, b) => `${a.date}T${a.ev.time}`.localeCompare(`${b.date}T${b.ev.time}`))

    const naive = compare(shomEvents, hourlyExtrema(hourly.time, hourly.sea_level_height_msl), startDate)
    const interp = compare(
      shomEvents,
      interpolatedExtrema(hourly.time, hourly.sea_level_height_msl),
      startDate,
    )

    // Biais systématique : médiane des écarts signés. Si le résidu absolu après
    // soustraction du biais est petit, une calibration par port suffirait.
    const medSigned = median(interp.deltas.map((d) => d.signedMin))
    const medAbsResidual = median(interp.deltas.map((d) => Math.abs(d.signedMin - medSigned)))

    summary.push({
      port: port.label,
      facade: port.facade,
      n: interp.deltas.length,
      medHourly: median(naive.deltas.map((d) => d.deltaMin)),
      maxHourly: Math.max(...naive.deltas.map((d) => d.deltaMin)),
      medInterp: median(interp.deltas.map((d) => d.deltaMin)),
      maxInterp: Math.max(...interp.deltas.map((d) => d.deltaMin)),
      medSigned,
      medAbsResidual,
      unmatched: interp.unmatched,
    })

    const rows = interp.deltas
      .map(
        (d) =>
          `| ${d.date} | ${d.type === 'high' ? 'PM' : 'BM'} | ${d.shom} | ${d.ours} | ${d.deltaMin} |`,
      )
      .join('\n')
    detailBlocks.push(
      `### ${port.label} (${facadeLabel(port.facade)})${port.note ? ` — ${port.note}` : ''}\n\n` +
        `| Date | Type | SHOM | Open-Meteo (interpolé) | Écart (min) |\n|---|---|---|---|---|\n${rows}\n`,
    )
  }

  const header =
    `| Port | Façade | n | Médiane horaire (min) | Max horaire | Médiane interpolée (min) | Max interpolé | Biais signé médian | Résidu médian après biais | Non matchés |\n` +
    `|---|---|---|---|---|---|---|---|---|---|\n`
  const tableRows = summary
    .map(
      (s) =>
        `| ${s.port} | ${facadeLabel(s.facade)} | ${s.n} | ${s.medHourly} | ${s.maxHourly} | ${s.medInterp} | ${s.maxInterp} | ${s.medSigned > 0 ? '+' : ''}${s.medSigned} | ${s.medAbsResidual} | ${s.unmatched} |`,
    )
    .join('\n')

  const allPass = summary.every((s) => s.medInterp < 15)
  const verdict = allPass
    ? '✅ GO : médiane interpolée < 15 min sur tous les ports → copy « horaires de marée vérifiés » autorisée (en portant l’interpolation parabolique dans l’app).'
    : '❌ NO-GO : au moins un port ≥ 15 min de médiane → pas de comm’, WorldTides prioritaire au sprint 11.'

  // ── Bloc seed pour tide_calibration (D3 : précision mesurée seulement) ──────
  // Une ligne par port, prête à seeder en service-role. window = fenêtre auditée.
  // sample_window porte la fenêtre + le mois pour la transparence sur la fiche spot.
  const verifiedAt = new Date().toISOString()
  const seedRows = summary.map((s) => {
    const port = Object.values(PORTS).find((p) => p.label === s.port)!
    return {
      port: s.port,
      lat: port.lat,
      lng: port.lon,
      facade: s.facade,
      median_error_min: round1(s.medInterp),
      bias_min: round1(s.medSigned),
      sample_window: `${startDate} → ${endDate} · ${s.n} extrema PM/BM`,
      source: 'SHOM (maree.info) vs Open-Meteo Marine (interpolation parabolique)',
    }
  })

  if (markdown) {
    console.log(`## Synthèse (fenêtre ${startDate} → ${endDate}, étalon : ${fixture.source})\n`)
    console.log(header + tableRows + '\n')
    console.log(`**Verdict** : ${verdict}\n`)
    console.log(`**verified_at** : ${verifiedAt}\n`)
    console.log('### Bloc seed `tide_calibration` (service-role)\n')
    console.log('```')
    console.log('port | lat | lng | facade | median_error_min | bias_min | sample_window | source')
    for (const r of seedRows) {
      console.log(
        `${r.port} | ${r.lat} | ${r.lng} | ${r.facade} | ${r.median_error_min} | ${r.bias_min} | ${r.sample_window} | ${r.source}`,
      )
    }
    console.log('```\n')
    console.log(detailBlocks.join('\n'))
  } else {
    console.table(summary)
    console.log(verdict)
    console.log(`\nverified_at = ${verifiedAt}`)
    console.log('\n── Bloc seed tide_calibration (service-role) ──')
    console.table(seedRows)
  }
}

function facadeLabel(f: Facade): string {
  return f === 'manche' ? 'Manche' : f === 'atlantique' ? 'Atlantique' : 'Méditerranée'
}

function round1(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : n
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
