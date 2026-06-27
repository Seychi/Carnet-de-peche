import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listMyGear } from '@/app/actions/gear'
import { TagData } from '@/components/ui-v2/tag-data'
import { GearBoxList } from '@/components/catches/GearBoxList'
import type { GearBoxEntry, GearSpeciesCount } from '@/components/catches/GearBoxList'

export const dynamic = 'force-dynamic'

/**
 * « Ma boîte » — chaque leurre/montage/appât de TA boîte avec son nombre de
 * prises et la répartition par espèce (« Shad chartreuse : 12 prises, dont bar
 * ×7, dorade ×3 »). Le matériel qui parle, sprint 37 WS D.
 *
 * Lecture strictement owner :
 *  - gear_items via listMyGear() (RLS owner-only).
 *  - prises via catches_for_viewer filtrée explicitement sur user_id = auth.uid()
 *    (jamais la table catches en direct ; jamais les prises d'autrui).
 * Pas de leaderboard, pas de comparaison entre pêcheurs.
 */
export default async function GearBoxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // ── Ma boîte (items non archivés) ─────────────────────────────────────────
  const gearResult = await listMyGear()
  const gear = gearResult.ok ? gearResult.data : []

  // ── Mes prises rattachées à un matériel ──────────────────────────────────
  // Lecture via la vue (jamais la table), scoping EXPLICITE sur mon user_id :
  // la boîte ne montre QUE mon matériel et MES prises, jamais celles d'autrui.
  const aggregates: Record<string, { total: number; bySpecies: Map<string, number> }> = {}

  if (gear.length > 0) {
    const { data: rows } = await supabase
      .from('catches_for_viewer')
      .select('gear_id, species')
      .eq('user_id', user.id)
      .not('gear_id', 'is', null)

    for (const row of rows ?? []) {
      const gid = row.gear_id
      if (!gid) continue
      const agg = (aggregates[gid] ??= { total: 0, bySpecies: new Map() })
      agg.total += 1
      const sp = row.species ?? 'inconnu'
      agg.bySpecies.set(sp, (agg.bySpecies.get(sp) ?? 0) + 1)
    }
  }

  // ── Composition des entrées (item + agrégats triés) ──────────────────────
  const entries: GearBoxEntry[] = gear.map((item) => {
    const agg = aggregates[item.id]
    const bySpecies: GearSpeciesCount[] = agg
      ? [...agg.bySpecies.entries()]
          .map(([species, count]) => ({ species, count }))
          .sort((a, b) => b.count - a.count)
      : []
    return {
      item,
      totalCatches: agg?.total ?? 0,
      bySpecies,
    }
  })

  // Le matériel le plus pêchant remonte (les leurres « morts » descendent).
  entries.sort((a, b) => b.totalCatches - a.totalCatches)

  const totalCatchesWithGear = entries.reduce((acc, e) => acc + e.totalCatches, 0)

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        {/* Retour au carnet */}
        <Link
          href="/carnet"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-ink-500 transition-colors hover:text-navy-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Retour au carnet
        </Link>

        <header className="mb-5 mt-1">
          <TagData>MA BOÎTE · MATÉRIEL</TagData>
          <h1 className="mt-1 font-display text-[26px] leading-tight text-navy-900 sm:text-[32px]">
            {gear.length > 0
              ? 'Ta boîte, et ce que chaque leurre te rapporte.'
              : 'Ta boîte à matériel'}
          </h1>
          {gear.length > 0 && (
            <p className="mt-2 text-[14px] text-ink-500">
              {gear.length} {gear.length > 1 ? 'références' : 'référence'}
              {totalCatchesWithGear > 0
                ? `, ${totalCatchesWithGear} prise${totalCatchesWithGear > 1 ? 's' : ''} rattachée${totalCatchesWithGear > 1 ? 's' : ''}.`
                : '. Logue une prise avec ton matériel pour voir ce qui pêche le mieux.'}
            </p>
          )}
        </header>

        <GearBoxList entries={entries} />
      </div>
    </div>
  )
}
