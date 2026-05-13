import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCatchById } from '@/lib/catches/queries'
import { CatchForm } from '@/components/catches/CatchForm'

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

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-navy-900">Modifier la prise</h1>
        <p className="text-[14px] text-ink-500 mt-1 mb-6">
          Les conditions sont recalculées si tu changes la position.
        </p>
        <CatchForm
          mode="edit"
          catchId={id}
          initialValues={c}
          existingPhotoUrl={existingPhotoUrl}
        />
      </div>
    </div>
  )
}
