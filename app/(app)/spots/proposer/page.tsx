import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MapPinPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isCoastalDepartment } from '@/lib/geo/departments'
import ProposeSpotForm from '@/components/spots/ProposeSpotForm'

export const metadata = { title: 'Proposer un spot — Carnet de Pêche' }
export const dynamic = 'force-dynamic'

export default async function ProposeSpotPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/spots/proposer')

  const { data: profile } = await supabase
    .from('profiles')
    .select('home_department')
    .eq('id', user.id)
    .maybeSingle()

  const dept = profile?.home_department?.trim()
  const defaultDepartment = dept && isCoastalDepartment(dept) ? dept : undefined

  return (
    <div className="mx-auto max-w-[640px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-teal-500/10">
          <MapPinPlus size={20} className="text-teal-600" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-navy-900">Proposer un spot</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Tu connais un bon coin <strong>public</strong> qui manque sur la carte ? Propose-le.
            Un modérateur le valide avant qu’il devienne visible de tous.{' '}
            <Link href="/spots/mes-propositions" className="font-medium text-teal-700 underline">
              Mes propositions
            </Link>
          </p>
        </div>
      </div>

      <ProposeSpotForm defaultDepartment={defaultDepartment} />
    </div>
  )
}
