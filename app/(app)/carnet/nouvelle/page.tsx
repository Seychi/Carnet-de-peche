import { redirect } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CatchForm } from '@/components/catches/CatchForm'
import { listMyGear } from '@/app/actions/gear'

type SpotRow = {
  id: string
  name: string
  slug: string
  department: string
  lat: number
  lng: number
}

async function fetchSpotById(spotId: string): Promise<SpotRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_spot_by_id', { p_id: spotId })
  if (error || !data || data.length === 0) return null
  const row = data[0]
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    department: String(row.department).trim(),
    lat: Number(row.lat),
    lng: Number(row.lng),
  }
}

export default async function NouvellePrisePage({
  searchParams,
}: {
  searchParams: Promise<{ spot_id?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { spot_id } = await searchParams
  const spot = spot_id ? await fetchSpotById(spot_id) : null

  // Hint première fois : si l'utilisateur n'a encore aucune prise.
  const { count } = await supabase
    .from('catches_for_viewer')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const isFirstCatch = (count ?? 0) === 0

  // Boîte à matériel (gear_items non archivés) pour le picker du form.
  const gearResult = await listMyGear()
  const gearItems = gearResult.ok ? gearResult.data : []

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header modal navy (réf mobile.html 05) — le flow Loguer est plein écran */}
      <header className="sticky top-0 z-40 bg-navy-950 text-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <h1 className="font-display text-[17px] font-semibold text-white">Nouvelle prise</h1>
          <Link
            href="/carnet"
            aria-label="Fermer et revenir au carnet"
            className="flex size-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            GPS + CONDITIONS AUTO-CAPTÉS
          </p>
          <Link href="/carnet/sortie" className="shrink-0 text-[12px] font-medium text-teal-600 hover:text-teal-700">
            Sorti bredouille ? →
          </Link>
        </div>

        {/* Hint première prise (sprint 25 WS-C) : on guide le tout premier log. */}
        {isFirstCatch && !spot && (
          <div className="mb-5 rounded-[14px] border border-teal-200 bg-teal-50 px-4 py-3">
            <p className="text-[13px] text-teal-900">
              <span className="font-semibold">Ta première prise.</span> Renseigne au moins l&rsquo;espèce, le
              lieu et la taille, la météo, la marée et les conditions sont captées automatiquement. Dès
              3 prises, ton carnet commence à te révéler tes tendances.
            </p>
          </div>
        )}

        <CatchForm
          mode="create"
          spotContext={spot ?? undefined}
          gearItems={gearItems}
        />
      </div>
    </div>
  )
}
