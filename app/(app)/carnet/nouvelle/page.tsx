import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CatchForm } from '@/components/catches/CatchForm'

export default async function NouvellePrisePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-navy-900">Logue ta prise</h1>
        <p className="text-[14px] text-ink-500 mt-1 mb-6">
          Toutes les conditions sont enregistrées automatiquement.
        </p>
        <CatchForm mode="create" />
      </div>
    </div>
  )
}
