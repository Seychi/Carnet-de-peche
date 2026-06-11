import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagData } from '@/components/ui-v2/tag-data'
import { ScoreRing } from '@/components/ui-v2/score-ring'
import { TideSparkline } from '@/components/ui-v2/tide-sparkline'
import { InstrumentsBar } from '@/components/ui-v2/instruments-bar'
import { Bathy } from '@/components/ui-v2/bathy'
import { Chip } from '@/components/ui-v2/chip'

// Vitrine des composants signature DA v2 — dev/preview uniquement.
export const dynamic = 'force-dynamic'

// Courbe de marée factice (2 PM / 2 BM, allure semi-diurne réaliste).
const TIDE_POINTS = Array.from({ length: 25 }, (_, h) => ({
  hour: h,
  height_m: 3.5 + 2.4 * Math.cos(((h - 6.7) / 12.42) * 2 * Math.PI),
}))
const TIDE_EXTREMA = [
  { type: 'high', hour: 6.7 },
  { type: 'low', hour: 12.97 },
  { type: 'high', hour: 19.12 },
] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-navy-900">{title}</h2>
      {children}
    </section>
  )
}

export default function UiV2DevPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="min-h-screen bg-sand-50 pb-24">
      <InstrumentsBar
        data={{
          deptCode: '29',
          deptLabel: 'Finistère',
          pm: '06:42',
          bm: '12:58',
          tideDirection: 'up',
          wind: 'NO 12',
          swell: '0,8 m · 9 s',
          slot: '18:30 → 21:30',
        }}
      />

      <div className="mx-auto flex max-w-[860px] flex-col gap-12 px-5 py-10">
        <header>
          <TagData variant="teal">DA V2 · COMPOSANTS SIGNATURE</TagData>
          <h1 className="font-display text-3xl text-navy-900">Instrument de précision marine</h1>
          <p className="text-[14px] text-ink-600">
            Vitrine dev des composants de la refonte (sprint 10.5). Jamais en production.
          </p>
        </header>

        <Section title="TagData — la signature mono">
          <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-sand-200 bg-white p-5">
            <TagData>48.0395°N · 4.7372°O</TagData>
            <TagData variant="teal">COEF 88 ▲</TagData>
            <TagData variant="gold">PM 06:42</TagData>
            <TagData variant="coral">ALERTE</TagData>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-[14px] bg-navy-950 p-5">
            <TagData variant="on-dark">06 MAI · COEF 88 ▼ · SHAD KAKI</TagData>
          </div>
        </Section>

        <Section title="ScoreRing — sémantique auto (≥75 teal · 50-74 gold · <50 gris)">
          <div className="flex flex-wrap items-end gap-6 rounded-[14px] border border-sand-200 bg-white p-5">
            <ScoreRing value={87} size="sm" />
            <ScoreRing value={87} size="md" />
            <ScoreRing value={64} size="md" />
            <ScoreRing value={32} size="md" />
            <ScoreRing value={91} size="lg" />
          </div>
          <div className="flex items-center gap-6 rounded-[14px] bg-navy-950 p-5">
            <ScoreRing value={87} size="md" onDark />
            <ScoreRing value={64} size="md" onDark />
          </div>
        </Section>

        <Section title="TideSparkline — courbe de marée + curseur « maintenant »">
          <div className="rounded-[14px] border border-sand-200 bg-white p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <b className="text-[14px] text-navy-900">Marée</b>
              <Chip variant="teal" mono>
                COEF 88 ▲
              </Chip>
            </div>
            <TideSparkline
              points={TIDE_POINTS}
              extrema={[...TIDE_EXTREMA]}
              nowHour={9.5}
              className="h-20"
            />
          </div>
        </Section>

        <Section title="Chips">
          <div className="flex flex-wrap gap-2 rounded-[14px] border border-sand-200 bg-white p-5">
            <Chip>Lieu 5</Chip>
            <Chip variant="teal">Bar 14</Chip>
            <Chip variant="gold">EXCEPT.</Chip>
            <Chip variant="navy">Privée</Chip>
            <Chip variant="coral">Alerte</Chip>
            <Chip variant="teal" mono>
              SCORE &gt; 60
            </Chip>
            <Chip mono>CARNET</Chip>
          </div>
        </Section>

        <Section title="Boutons (primary navy · accent teal · outline bordure)">
          <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-sand-200 bg-white p-5">
            <Button>Voir le spot</Button>
            <Button variant="accent">+ Loguer une prise</Button>
            <Button variant="outline">Itinéraire ↗</Button>
          </div>
        </Section>

        <Section title="Card — défaut + variante live (liseré teal)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card par défaut</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-ink-600">Bordure fine sand-200, plus d&apos;ombre lourde.</p>
              </CardContent>
            </Card>
            <Card variant="live">
              <CardHeader>
                <CardTitle>Ton créneau · 18:30 → 21:30</CardTitle>
              </CardHeader>
              <CardContent>
                <TagData>DESCENDANTE + CRÉPUSCULE = TES CONDITIONS À 91 %</TagData>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Bathy — isobathes (hero / sections sombres / footer)">
          <div className="relative h-56 overflow-hidden rounded-[14px] bg-navy-950 p-6">
            <Bathy withLabels />
            <div className="relative">
              <TagData variant="on-dark">LE MOTIF IDENTITAIRE</TagData>
              <p className="font-display text-2xl text-white">Carte marine, pas vague générique.</p>
            </div>
          </div>
        </Section>
      </div>
    </main>
  )
}
