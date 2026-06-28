import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCatchById } from '@/lib/catches/queries'
import { CatchForm } from '@/components/catches/CatchForm'
import { BackButton } from '@/components/layout/BackButton'
import { listMyGear, type GearItem } from '@/app/actions/gear'

type Props = { params: Promise<{ id: string }> }

export default async function ModifierPrisePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const c = await getCatchById(id)
  if (!c) notFound()
  if (c.user_id !== user.id) notFound()

  let existingPhotoUrl: string | null = null
  if (c.photo_path) {
    const { data: signed } = await supabase.storage
      .from('catches')
      .createSignedUrl(c.photo_path, 3600)
    existingPhotoUrl = signed?.signedUrl ?? null
  }

  // Boîte à matériel (gear_items non archivés) pour le picker. Le gear_id existant
  // de la prise est pré-sélectionné via initialValues (rowToDefaults).
  const gearResult = await listMyGear()
  const gearItems = gearResult.ok ? [...gearResult.data] : []

  // Si la prise est rattachée à un matériel ARCHIVÉ (donc absent de listMyGear),
  // on l'injecte dans la liste pour qu'il reste affiché et sélectionné. Lecture
  // owner-scopée par id (RLS gear_items_select_own en backstop) ; on n'expose
  // jamais le matériel d'autrui.
  if (c.gear_id && !gearItems.some((g) => g.id === c.gear_id)) {
    const { data: archived } = await supabase
      .from('gear_items')
      .select('id, kind, brand, model, color, size_mm, notes')
      .eq('id', c.gear_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (archived) gearItems.unshift(archived as GearItem)
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Flèche retour mobile (cachée sur desktop) */}
        <BackButton fallbackHref={`/carnet/${id}`} className="mb-3" />

        <h1 className="text-2xl font-bold text-navy-900">Modifier la prise</h1>
        <p className="text-[14px] text-ink-500 mt-1 mb-6">
          Les conditions sont recalculées si tu changes la position.
        </p>
        <CatchForm
          mode="edit"
          catchId={id}
          initialValues={c}
          existingPhotoUrl={existingPhotoUrl}
          gearItems={gearItems}
        />
      </div>
    </div>
  )
}
