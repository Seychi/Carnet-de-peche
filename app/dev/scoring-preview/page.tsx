import { notFound } from 'next/navigation'
import { computeWeeklyForecast } from '@/lib/solunar/index'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'
import type { PersonalProfile, PersonalInsight, PersonalMultiplier } from '@/lib/scoring/types'
import { PersonalScoreSection } from '@/components/scoring/PersonalScoreSection'
import { SpotBestMomentsSection } from '@/components/spots/SpotBestMomentsSection'

// force-dynamic : empêche le pre-rendering au build (notFound() en prod)
export const dynamic = 'force-dynamic'

// ─── Mock conditions (vent modéré 20 km/h) ────────────────────────────────────
// 20 km/h → windRaw = 0.75 (pas plafonné), pour que le multiplicateur vent ×1.5
// déplace réellement le score et déclenche la raison "Personnalisé" (≥ 5 pts).

const MOCK_CONDITIONS: SpotConditions = {
  fetched_at: new Date().toISOString(),
  date: new Date().toISOString().slice(0, 10),
  tide: { points: [], extrema: [], current_height_m: null },
  weather: {
    code: 1,
    air_temp_c: 17,
    min_temp_c: 13,
    max_temp_c: 21,
    wind_speed_kmh: 20,
    wind_direction_deg: 250,
    precipitation_mm: 0,
    precipitation_probability: 10,
    pressure_hpa: 1017,
    cloud_cover_pct: 25,
    humidity_pct: 65,
    sunrise: null,
    sunset: null,
  },
  waves: { height_m: 0.6, direction_deg: 270, period_s: 7, water_temp_c: 14 },
  swell: { height_m: 0.4, period_s: 9 },
}

const NOW = new Date().toISOString()

// ─── Profils mockés ───────────────────────────────────────────────────────────

// Insights riches : couvre les 4 icônes (wind/tide/hour/season),
// positifs + négatifs, et les 3 niveaux de confidence (low/medium/high).
const RICH_INSIGHTS: PersonalInsight[] = [
  { factor: 'wind',   label: 'Modéré (15-25 km/h)', description: '82% de tes meilleures prises (sur 22 sessions)', catchRate: 0.82, sampleCount: 22, isPositive: true, confidence: 'high' },
  { factor: 'tide',   label: 'Marée montante',    description: '71% de tes meilleures prises (sur 14 sessions)', catchRate: 0.71, sampleCount: 14, isPositive: true,  confidence: 'medium' },
  { factor: 'hour',   label: "À l'aube",          description: '68% de tes meilleures prises (sur 9 sessions)',  catchRate: 0.68, sampleCount: 9,  isPositive: true,  confidence: 'medium' },
  { factor: 'season', label: 'Au printemps',      description: '64% de tes meilleures prises (sur 4 sessions)',  catchRate: 0.64, sampleCount: 4,  isPositive: true,  confidence: 'low' },
  { factor: 'wind',   label: 'Fort (25-40 km/h)', description: '21% de tes meilleures prises (sur 6 sessions)',  catchRate: 0.21, sampleCount: 6,  isPositive: false, confidence: 'medium' },
  { factor: 'tide',   label: 'Marée étale',       description: '18% de tes meilleures prises (sur 3 sessions)',  catchRate: 0.18, sampleCount: 3,  isPositive: false, confidence: 'low' },
]

const RICH_MULTIPLIER: PersonalMultiplier = {
  wind: 1.5,     // > 1 → barre teal
  tide: 1.3,     // > 1 → barre teal
  solunar: 0.8,  // < 1 → barre rougeâtre (montre le côté gauche de l'échelle)
  computedAt: NOW,
  basedOnCatches: 28,
}

const profileRich: PersonalProfile = {
  userId: 'mock-rich',
  insights: RICH_INSIGHTS,
  multiplier: RICH_MULTIPLIER,
  hasEnoughData: true,
}

// 2 prises → pas assez de données → empty state
const profileEmpty: PersonalProfile = {
  userId: 'mock-empty',
  insights: [],
  multiplier: { wind: 1, tide: 1, solunar: 1, computedAt: NOW, basedOnCatches: 2 },
  hasEnoughData: false,
}

// 4 prises → insights visibles mais pas encore de multiplicateurs (< 5)
const profileMid: PersonalProfile = {
  userId: 'mock-mid',
  insights: [
    { factor: 'wind', label: 'Léger (5-15 km/h)', description: '75% de tes prises (sur 3 sessions)', catchRate: 0.75, sampleCount: 3, isPositive: true,  confidence: 'low' },
    { factor: 'hour', label: 'Le matin',          description: '40% de tes prises (sur 2 sessions)', catchRate: 0.40, sampleCount: 2, isPositive: false, confidence: 'low' },
  ],
  multiplier: { wind: 1, tide: 1, solunar: 1, computedAt: NOW, basedOnCatches: 4 },
  hasEnoughData: true,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const WMO_BY_DAY = [1, 2, 3, 61, 80, 1, 0]

export default async function ScoringPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const today = new Date()
  const LAT = 48.04
  const LNG = -4.73
  const conditions = Array.from({ length: 7 }, () => MOCK_CONDITIONS)

  // Deux forecasts : avec multiplicateur perso (⚡ + chips) et sans (baseline sprint 6)
  const [weeklyPerso, weeklyBase] = await Promise.all([
    computeWeeklyForecast(today, LAT, LNG, conditions, RICH_MULTIPLIER),
    computeWeeklyForecast(today, LAT, LNG, conditions),
  ])

  const weatherCodes: Record<string, number> = {}
  weeklyPerso.forEach((d, i) => {
    weatherCodes[d.date] = WMO_BY_DAY[i] ?? 1
  })

  return (
    <div className="min-h-screen bg-sand-50 font-sans">
      {/* Banner dev */}
      <div className="bg-amber-400 px-4 py-2 text-center text-[13px] font-bold text-amber-900">
        🛠 Scoring Preview — dev uniquement — données mockées — non visible en prod
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-12">
        <header>
          <h1 className="text-2xl font-bold text-navy-900 font-display">
            Scoring personnalisé — Preview
          </h1>
          <p className="text-[13px] text-ink-500 mt-1">
            Tous les états de PersonalScoreSection + le rendu ⚡/InsightChip sur fiche spot.
            Réduis la fenêtre (&lt; 768px) pour vérifier le rendu mobile.
          </p>
        </header>

        {/* ── État 1 : empty state (2 prises) ─────────────────────────── */}
        <PreviewBlock title="PersonalScoreSection — 2 prises (empty state)">
          <PersonalScoreSection profile={profileEmpty} />
        </PreviewBlock>

        {/* ── État 2 : insights sans jauges (4 prises) ────────────────── */}
        <PreviewBlock title="PersonalScoreSection — 4 prises (insights, pas encore de multiplicateurs)">
          <PersonalScoreSection profile={profileMid} />
        </PreviewBlock>

        {/* ── État 3 : profil riche (28 prises) ───────────────────────── */}
        <PreviewBlock title="PersonalScoreSection — 28 prises (jauges + insights triés)">
          <PersonalScoreSection profile={profileRich} />
        </PreviewBlock>

        {/* ── État 4 : fiche spot personnalisée (⚡ + chips) ───────────── */}
        <PreviewBlock title="SpotBestMomentsSection — multiplicateur actif (⚡ + InsightChip)">
          <SpotBestMomentsSection
            weekly={weeklyPerso}
            spotName="Pointe du Raz"
            weatherCodes={weatherCodes}
            insights={profileRich.insights}
          />
        </PreviewBlock>

        {/* ── État 5 : baseline sprint 6 (non perso) ──────────────────── */}
        <PreviewBlock title="SpotBestMomentsSection — baseline (non connecté / 0 prise)">
          <SpotBestMomentsSection
            weekly={weeklyBase}
            spotName="Pointe du Raz"
            weatherCodes={weatherCodes}
          />
        </PreviewBlock>
      </div>
    </div>
  )
}

// ─── Sous-composant ───────────────────────────────────────────────────────────

function PreviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">
        {title}
      </h2>
      {children}
    </section>
  )
}
