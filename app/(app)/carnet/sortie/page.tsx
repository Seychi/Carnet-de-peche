import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OutingForm } from '@/components/outings/OutingForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Loguer une sortie — Carnet de Pêche',
}

export default async function NewOutingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/carnet/sortie')

  const { data: profile } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <Link href="/carnet" className="text-[13px] text-ink-400 hover:text-ink-700 transition-colors">
            ← Carnet
          </Link>
          <Link href="/carnet/nouvelle" className="text-[13px] text-teal-600 hover:text-teal-700">
            J&rsquo;ai pris du poisson →
          </Link>
        </div>
        <h1 className="mb-1 text-[22px] font-bold text-navy-900">Loguer une sortie</h1>
        <p className="mb-6 text-[14px] text-ink-500">
          Sorti sans rien ramener ? Ça compte aussi. On enregistre la sortie, pas une prise.
        </p>
        <OutingForm defaultDepartment={profile?.home_department ?? null} />
      </div>
    </div>
  )
}
