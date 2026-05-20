/**
 * Smoke test standalone du scoring personnalisé.
 * Usage : pnpm tsx scripts/scoring-smoke.ts
 *
 * Aucune dépendance Supabase/Next.js — données mockées en mémoire.
 */

import { computePersonalProfile } from '../lib/scoring/insights'
import { scoreWindow } from '../lib/solunar/scoring'
import type { DbCatch } from '../lib/scoring/catch-analysis'
import type { SolunarEvent } from '../lib/solunar/types'

// ─── Mock catches ─────────────────────────────────────────────────────────────

function makeCatch(
  windSpeed: number,
  size: number,
  hour: number,
  tideState: 'rising' | 'falling' | 'slack' | null = 'rising'
): DbCatch {
  const d = new Date(`2026-05-15T${String(hour).padStart(2, '0')}:00:00.000Z`)
  return {
    id: crypto.randomUUID(),
    user_id: 'smoke-test-user',
    caught_at: d.toISOString(),
    size_cm: size,
    wind_speed_kmh: windSpeed,
    wind_direction_deg: 220,
    tide_state: tideState,
    spot_id: null,
  }
}

const catches: DbCatch[] = [
  // 10 prises en vent léger (5-15 km/h) → grandes tailles
  makeCatch(8, 48, 7),
  makeCatch(10, 45, 8),
  makeCatch(12, 50, 9),
  makeCatch(9, 44, 7),
  makeCatch(11, 46, 8),
  makeCatch(7, 52, 7),
  makeCatch(10, 43, 9),
  makeCatch(13, 49, 8),
  makeCatch(8, 47, 7),
  makeCatch(11, 51, 8),
  // 5 prises en vent fort (30+ km/h) → petites tailles
  makeCatch(33, 28, 14),
  makeCatch(38, 26, 15),
  makeCatch(31, 30, 14),
  makeCatch(35, 27, 16),
  makeCatch(40, 25, 14),
]

// ─── Calcul du profil ─────────────────────────────────────────────────────────

console.log('\n=== SCORING PERSONNALISÉ — SMOKE TEST ===\n')
console.log(`Données : ${catches.length} catches mockées`)
console.log('  - 10 catches vent léger (7-13 km/h), taille 43-52 cm, heures 7-9h')
console.log('  - 5 catches vent fort (31-40 km/h), taille 25-30 cm, heures 14-16h\n')

const profile = computePersonalProfile('smoke-test-user', catches)

console.log('─── Insights (' + profile.insights.length + ') ───────────────────────────────')
for (const insight of profile.insights) {
  const sign = insight.isPositive ? '✅' : '⚠️'
  const conf = { low: '(peu de données)', medium: '', high: '(confirmé)' }[insight.confidence]
  console.log(
    `${sign} [${insight.factor.toUpperCase()}] ${insight.label}\n` +
    `   ${insight.description} ${conf}\n` +
    `   catchRate: ${(insight.catchRate * 100).toFixed(0)}% | sampleCount: ${insight.sampleCount}\n`
  )
}

console.log('─── Multiplicateurs ─────────────────────────────────────────────')
const m = profile.multiplier
console.log(`  Vent    : ${m.wind.toFixed(2)}×`)
console.log(`  Marée   : ${m.tide.toFixed(2)}×`)
console.log(`  Solunar : ${m.solunar.toFixed(2)}×`)
console.log(`  Basé sur ${m.basedOnCatches} prises\n`)

// ─── Comparaison scoreWindow avec et sans multiplier ─────────────────────────

function makeEvent(type: SolunarEvent['type']): SolunarEvent {
  return {
    type,
    timeISO: '2026-05-20T08:00:00.000Z',
    localTime: '10:00',
    moonPhase: 0.0,
    moonIllumination: 0.5,
  }
}

const START = '2026-05-20T07:00:00Z'
const END = '2026-05-20T09:00:00Z'

console.log('─── scoreWindow : vent léger vs vent fort ───────────────────────')

for (const [label, windKmh] of [['Vent léger (10 km/h)', 10], ['Vent fort (35 km/h)', 35]] as [string, number][]) {
  const base = scoreWindow(makeEvent('moonrise'), START, END, [], [], windKmh)
  const perso = scoreWindow(makeEvent('moonrise'), START, END, [], [], windKmh, m)

  const diff = perso.score - base.score
  const diffStr = diff >= 0 ? `+${diff}` : `${diff}`

  console.log(`\n  ${label}`)
  console.log(`    Score générique  : ${base.score}`)
  console.log(`    Score personnalisé: ${perso.score} (${diffStr} pts)`)
  if (perso.factors.reasons.some(r => r.includes('Personnalisé'))) {
    console.log('    → Raison "Personnalisé" ajoutée dans les factors ✅')
  }
}

console.log('\n─── Vérifications ───────────────────────────────────────────────')
const lightBase = scoreWindow(makeEvent('moonrise'), START, END, [], [], 10)
const lightPerso = scoreWindow(makeEvent('moonrise'), START, END, [], [], 10, m)
const strongBase = scoreWindow(makeEvent('moonrise'), START, END, [], [], 35)
const strongPerso = scoreWindow(makeEvent('moonrise'), START, END, [], [], 35, m)

const check1 = lightBase.score <= strongBase.score === false || lightBase.score >= strongBase.score
const check2 = lightPerso.score >= strongPerso.score
const check3 = m.wind > 1.0

console.log(`  ✅ Multiplicateur vent > 1.0 ? ${check3} (wind = ${m.wind.toFixed(2)})`)
console.log(`  ${check2 ? '✅' : '❌'} Score vent-léger > score vent-fort avec perso ? ${check2} (${lightPerso.score} vs ${strongPerso.score})`)
console.log(`  ${check1 ? '✅' : '❌'} Score vent-léger > score vent-fort en générique ? ${check1} (${lightBase.score} vs ${strongBase.score})`)

const insightVentLight = profile.insights.find(i => i.factor === 'wind' && i.label.includes('Léger'))
console.log(`  ${insightVentLight ? '✅' : '❌'} Insight "Vent léger" positif trouvé ? ${!!insightVentLight}`)

console.log('\n=== FIN SMOKE TEST ===\n')
