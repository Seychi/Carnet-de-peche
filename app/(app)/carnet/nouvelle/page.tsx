import { redirect } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CatchForm } from '@/components/catches/CatchForm'

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

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header modal navy (réf mobile.html 05) — le flow Loguer est plein écran */}
      <header className="sticky top-0 z-40 bg-navy-950 text-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <h1 className="font-display text-[17px] font-semibold">Nouvelle prise</h1>
          <Link
            href="/carnet"
            aria-label="Fermer et revenir au carnet"
            className="flex size-11 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <p className="mb-5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
          GPS + CONDITIONS AUTO-CAPTÉS
        </p>

        <CatchForm
          mode="create"
          spotContext={spot ?? undefined}
        />
      </div>
    </div>
  )
}
