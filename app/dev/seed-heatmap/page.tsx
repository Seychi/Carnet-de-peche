import { notFound } from 'next/navigation'
import { SeedHeatmapButton } from './seed-heatmap-button'
import { SEED_HEAT_ZONES } from '@/lib/map/seed-heatmap-data'

// force-dynamic + garde NODE_ENV : la page n'existe qu'en dev/preview.
export const dynamic = 'force-dynamic'

export default function SeedHeatmapDevPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const total = SEED_HEAT_ZONES.reduce((n, z) => n + z.catches.length, 0)

  return (
    <main className="bg-sand-50 min-h-screen">
      <div className="mx-auto max-w-[680px] px-4 py-10 flex flex-col gap-4">
        <h1 className="font-display text-2xl text-navy-900">Seed de la heatmap (dev)</h1>
        <p className="text-[14px] text-ink-600">
          Insère {total} prises publiques géolocalisées sur {SEED_HEAT_ZONES.length} zones chaudes
          bretonnes ({SEED_HEAT_ZONES.map((z) => z.department).join('/')}), chacune avec ≥ 3 pêcheurs
          distincts pour passer le k-anonymat K=3 de <code>get_catch_heatmap</code>. Idempotent
          (marqueur <code>location_label=seed-heatmap-c1</code>). Réservé dev/preview — jamais en
          production.
        </p>
        <SeedHeatmapButton />
        <p className="text-[12px] text-ink-400">
          Réutilise les 6 pêcheurs de <code>/dev/seed-feed</code>. Après le seed, ouvre <code>/carte</code>,
          active la couche « Zones de prises » et dézoome sur la Bretagne.
        </p>
      </div>
    </main>
  )
}
