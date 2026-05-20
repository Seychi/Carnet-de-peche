import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CatchForm } from '@/components/catches/CatchForm'
import { BackButton } from '@/components/layout/BackButton'

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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <BackButton fallbackHref="/carnet" className="mb-3" />

        <h1 className="text-2xl font-bold text-navy-900">Logue ta prise</h1>
        <p className="text-[14px] text-ink-500 mt-1 mb-6">
          Toutes les conditions sont enregistrées automatiquement.
        </p>

        <CatchForm
          mode="create"
          spotContext={spot ?? undefined}
        />
      </div>
    </div>
  )
}
